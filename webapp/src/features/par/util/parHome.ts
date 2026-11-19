// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

// The Active cycle tracker: where the employee is in the cycle, and the one thing to do next.
import type { ParCycle, ParRating, Par360Reviewer, Par360ReviewRequest } from "../api/types";
import { MIN_360_RESPONSES } from "../api/review360Types";
import { isDeadlinePassed } from "./parDeadline";

export type HomeStepKey = "self-review" | "360" | "lead-review" | "f2f";
export type HomeStepState = "done" | "current" | "upcoming";
/** Whose move a step is: the employee's, someone else's, nobody's yet (it opens later), or done.
 * "enough" is 360° feedback with enough answers for results while more can still come in;
 * "closed", a step whose deadline passed before it was finished (for 360° feedback, without
 * enough answers). */
export type HomeStepStatus = "todo" | "waiting" | "locked" | "enough" | "done" | "closed";

export interface HomeStep {
  key: HomeStepKey;
  label: string;
  state: HomeStepState;
  status: HomeStepStatus;
  /** Who a waiting step waits on. */
  waitingOn?: string;
  detail: string;
  due?: string;
  /** What the date chip says before the date: the employee's own deadlines are "Due"; someone
   * else's, "Expected by". */
  dueLabel?: string;
}

export interface HomeInput {
  cycle: ParCycle;
  rating: ParRating;
  // Sections of the self-review answered so far, and how many there are.
  selfReviewProgress?: { answered: number; total: number };
  reviewers: Par360Reviewer[];
  requests: Par360ReviewRequest[];
  /** A member of the leadership team: their 360° feedback is Leadership 360°, and only how many
   * responded is known, not who. */
  leadership?: { responseCount: number };
  /** The lead's name, when known. */
  leadName?: string;
}

export function feedbackProgress(reviewers: Par360Reviewer[]) {
  const asked = reviewers.filter((r) => r.reviewStatus !== "REJECTED" && r.reviewStatus !== "SANITIZED").length;
  const responded = reviewers.filter((r) => r.reviewStatus === "SHARED").length;
  const declined = reviewers.filter((r) => r.reviewStatus === "REJECTED").length;
  return { asked, responded, declined };
}

// Requests for your feedback you haven't answered yet. Feedback you offered
// without being asked is yours to finish, not a request.
export function openRequests(requests: Par360ReviewRequest[]): Par360ReviewRequest[] {
  return requests.filter(
    (r) => (r.reviewStatus === "PENDING" || r.reviewStatus === "DRAFT") && (r.isEmployeeRequested || r.isLeadRequested),
  );
}

export function homeSteps({ cycle, rating, selfReviewProgress, reviewers, leadership, leadName }: HomeInput): HomeStep[] {
  const lead = leadName ?? "your lead";
  const Lead = leadName ?? "Your lead";
  const selfShared = rating.parEmployeeStatus === "SHARED" || rating.parEmployeeStatus === "SHARED_BLOCKED";
  const leadShared = rating.parLeadStatus === "SHARED";
  const f2fDone = rating.parF2fStatus === "COMPLETED";
  // Nothing is submitted for the employee at a deadline: their own steps lock, so a missed one closes.
  const selfMissed = !selfShared && isDeadlinePassed(cycle.parEmployeeDeadline);
  const f2fMissed = !f2fDone && isDeadlinePassed(cycle.parF2FDeadline);
  const { asked, responded: parResponded } = feedbackProgress(reviewers);
  const responded = leadership ? leadership.responseCount : parResponded;
  const feedbackDone = responded >= MIN_360_RESPONSES || leadShared || isDeadlinePassed(cycle.parThreeSixtyRatingDeadline);

  const steps: Omit<HomeStep, "state" | "status" | "waitingOn">[] = [
    {
      key: "self-review",
      label: "Self-review",
      detail: selfShared
        ? "Shared with your lead"
        : selfMissed
          ? "Not shared by the deadline"
          : rating.parEmployeeStatus === "DRAFT"
          ? selfReviewProgress
            ? `${selfReviewProgress.answered} of ${selfReviewProgress.total} sections`
            : "Draft saved"
          : "Not started",
      due: cycle.parEmployeeDeadline,
    },
    {
      key: "360",
      label: "360° feedback",
      detail: leadership
        ? `Leadership 360°: ${responded > 0 ? `${responded} submitted` : "none yet"}`
        : asked === 0
          ? feedbackDone
            ? "None requested"
            : "None requested yet"
          : `${responded} of ${asked} submitted`,
      due: cycle.parThreeSixtyRatingDeadline,
    },
    {
      key: "lead-review",
      label: "Lead review",
      // The lead's draft never shows: the employee isn't told when their lead starts.
      detail: leadShared ? "Shared with you" : selfShared || selfMissed ? `With ${lead}` : `${Lead} reviews after you share`,
      due: cycle.parLeadDeadline,
      dueLabel: "Expected by",
    },
    {
      key: "f2f",
      label: "Face-to-face",
      detail: f2fDone
        ? "Done"
        : f2fMissed
          ? "Not marked done by the deadline"
          : rating.parF2fStatus === "SCHEDULED"
          ? "Booked"
          : leadShared
            ? `You book it with ${lead}`
            : `Opens after ${lead} shares`,
      due: cycle.parF2FDeadline,
    },
  ];
  const done: Record<HomeStepKey, boolean> = {
    "self-review": selfShared || selfMissed,
    "360": feedbackDone,
    "lead-review": leadShared,
    f2f: f2fDone || f2fMissed,
  };
  // Asking enough people is the employee's part; after that, 360° feedback waits on them. With
  // enough answers it's "enough" while more can still come in (a leader's always can), "done"
  // once everyone asked has answered or the window has closed.
  const feedbackOpen = !leadShared && !isDeadlinePassed(cycle.parThreeSixtyRatingDeadline);
  const moreToCome = leadership !== undefined || parResponded < asked;
  const status: Record<HomeStepKey, HomeStepStatus> = {
    "self-review": selfShared ? "done" : selfMissed ? "closed" : "todo",
    "360": feedbackDone
      ? responded < MIN_360_RESPONSES
        ? "closed"
        : feedbackOpen && moreToCome
          ? "enough"
          : "done"
      : asked >= MIN_360_RESPONSES
        ? "waiting"
        : "todo",
    "lead-review": leadShared ? "done" : "waiting",
    // The employee books the F2F, once the lead has shared.
    f2f: f2fDone ? "done" : f2fMissed ? "closed" : leadShared ? "todo" : "locked",
  };
  const waitingOn: Partial<Record<HomeStepKey, string>> = {
    "360": "reviewers",
    "lead-review": selfShared || selfMissed ? lead : "your self-review",
  };
  const current = steps.find((s) => !done[s.key])?.key;
  return steps.map((s) => ({
    ...s,
    state: done[s.key] ? "done" : s.key === current ? "current" : "upcoming",
    status: status[s.key],
    ...(status[s.key] === "waiting" ? { waitingOn: waitingOn[s.key] } : {}),
  }));
}

// The step Active cycle opens on: the self-review while it's yours to share, the lead's review once
// they've shared it, else 360° feedback while it's yours to request, else the self-review. Never the
// face-to-face.
export function landingStep(input: HomeInput): HomeStepKey {
  const status = Object.fromEntries(homeSteps(input).map((s) => [s.key, s.status])) as Record<HomeStepKey, HomeStepStatus>;
  if (status["self-review"] === "todo") return "self-review";
  if (status["lead-review"] === "done") return "lead-review";
  if (status["360"] === "todo") return "360";
  return "self-review";
}

// Why a step closed. The lead review never does: its deadline is the lead's.
export const CLOSED_NOTE: Partial<Record<HomeStepKey, string>> = {
  "self-review": "The deadline passed before it was shared, so it's locked.",
  "360": "The 360° window closed without enough feedback for results.",
  f2f: "The deadline passed before it was marked done, so it's locked.",
};

/** The one-line banner under the steps, for the step whose part is open. It says only what the step's tab and its
 * part below don't: what happens next, and by when. */
export interface StepBanner {
  text: string;
  /** The employee's move, someone else's, done, closed, or not open yet. */
  tone: "todo" | "waiting" | "done" | "closed" | "locked";
  due?: string;
  /** Said before the date: "Due" (the default) for the employee's own deadline, else whose it is. */
  dueLabel?: string;
}

export function stepBanner(input: HomeInput, key: HomeStepKey): StepBanner {
  const { cycle, rating, reviewers, requests, leadership, leadName } = input;
  const lead = leadName ?? "your lead";
  const Lead = leadName ?? "Your lead";
  const step = homeSteps(input).find((s) => s.key === key)!;
  const selfShared = rating.parEmployeeStatus === "SHARED" || rating.parEmployeeStatus === "SHARED_BLOCKED";
  const leadShared = rating.parLeadStatus === "SHARED";
  const { asked } = feedbackProgress(reviewers);
  const closed: StepBanner = { text: CLOSED_NOTE[key] ?? "", tone: "closed" };

  switch (key) {
    case "self-review":
      if (step.status === "todo") {
        return { text: `${Lead} sees it once you share it.`, tone: "todo", due: cycle.parEmployeeDeadline };
      }
      if (step.status === "closed") return closed;
      return {
        // Unsharing ends once the lead starts (the self-review is then locked) or the deadline passes; when
        // isn't said, for the same reason as the lead review's detail.
        text: leadShared
          ? `${Lead} has shared their review, in Lead review.`
          : rating.parEmployeeStatus === "SHARED" && !isDeadlinePassed(cycle.parEmployeeDeadline)
            ? "You can still unshare it to make changes."
            : `You'll get an email when ${lead} shares their review.`,
        tone: "done",
      };
    case "360": {
      if (step.status === "todo") {
        return {
          text: leadership
            ? "Ask people who work closely with you. They can answer named or anonymously."
            : `Ask at least ${MIN_360_RESPONSES} people who worked closely with you (${asked} so far).`,
          tone: "todo",
          due: cycle.parThreeSixtyRatingDeadline,
        };
      }
      // With nothing to do for your own, feedback others asked you for comes first.
      const waiting = openRequests(requests);
      if (waiting.length > 0 && !isDeadlinePassed(cycle.parThreeSixtyRatingDeadline)) {
        return {
          text: `${
            waiting.length > 1 ? `${waiting.length} people` : (waiting[0].employeeName ?? waiting[0].employeeEmail)
          } asked for your feedback. It's in Give feedback.`,
          tone: "todo",
          due: cycle.parThreeSixtyRatingDeadline,
        };
      }
      if (step.status === "waiting") {
        return {
          text: `Results show once ${MIN_360_RESPONSES} have answered.`,
          tone: "waiting",
          due: cycle.parThreeSixtyRatingDeadline,
          dueLabel: "Open until",
        };
      }
      if (step.status === "enough") {
        return {
          text: "Enough for results. More can still come in.",
          tone: "done",
          due: cycle.parThreeSixtyRatingDeadline,
          dueLabel: "Open until",
        };
      }
      if (step.status === "closed") return closed;
      return { text: "Your 360° feedback is in.", tone: "done" };
    }
    case "lead-review": {
      if (leadShared) return { text: "Your rating and feedback are here, with your PAR's PDF.", tone: "done" };
      return {
        text:
          selfShared || isDeadlinePassed(cycle.parEmployeeDeadline)
            ? `Nothing for you to do yet. You'll get an email when ${lead} shares it.`
            : "Nothing to do here until you share your self-review.",
        tone: "waiting",
        due: cycle.parLeadDeadline,
        dueLabel: "Expected by",
      };
    }
    case "f2f":
      if (step.status === "done") return { text: "Your PAR is complete. Download it from Lead review.", tone: "done" };
      if (step.status === "closed") return closed;
      if (step.status === "locked") {
        return {
          text: `Talk it through with ${lead} once they share, then mark it done.`,
          tone: "locked",
          due: cycle.parF2FDeadline,
        };
      }
      return {
        text:
          rating.parF2fStatus === "SCHEDULED"
            ? `Talk it through with ${lead}, then mark it done.`
            : `Find a time with ${lead} to talk it through, then mark it done.`,
        tone: "todo",
        due: cycle.parF2FDeadline,
      };
  }
}
