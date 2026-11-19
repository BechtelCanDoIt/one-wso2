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

import { daysLeft, daysLeftLabel, deadlineEndsEverywhereAt } from "./parDeadline";
import { describe, expect, it } from "vitest";
import type { ParCycle, ParRating, Par360Reviewer, Par360ReviewRequest } from "../api/types";
import { CLOSED_NOTE, homeSteps, landingStep, stepBanner, type HomeInput } from "./parHome";

const FUTURE = "2999-12-31";
const PAST = "2000-01-01";

const cycle = {
  parCycleId: 2,
  parEmployeeDeadline: FUTURE,
  parThreeSixtyRatingDeadline: FUTURE,
  parLeadDeadline: FUTURE,
  parF2FDeadline: FUTURE,
} as ParCycle;

const rating = (over: Partial<ParRating> = {}): ParRating =>
  ({
    parRatingId: 1,
    parEmployeeStatus: "PENDING",
    parLeadStatus: "PENDING",
    parF2fStatus: "PENDING",
    ...over,
  }) as ParRating;

const reviewer = (reviewStatus: Par360Reviewer["reviewStatus"], n: number): Par360Reviewer => ({
  reviewerEmail: `r${n}@x.com`,
  reviewStatus,
  isEmployeeRequested: true,
  isLeadRequested: false,
});

const input = (over: Partial<HomeInput> = {}): HomeInput => ({
  cycle,
  rating: rating(),
  reviewers: [],
  requests: [],
  ...over,
});

describe("landingStep", () => {
  const asked = (n: number) => Array.from({ length: n }, (_, i) => reviewer("PENDING", i));

  it("opens the self-review while it's yours to share", () => {
    expect(landingStep(input())).toBe("self-review");
    expect(landingStep(input({ rating: rating({ parEmployeeStatus: "DRAFT" }) }))).toBe("self-review");
  });

  it("opens 360° feedback once the self-review is shared and fewer than 3 were asked", () => {
    expect(landingStep(input({ rating: rating({ parEmployeeStatus: "SHARED" }), reviewers: asked(2) }))).toBe("360");
  });

  it("opens the lead's review once they've shared it", () => {
    const shared = rating({ parEmployeeStatus: "SHARED", parLeadStatus: "SHARED" });
    expect(landingStep(input({ rating: shared }))).toBe("lead-review");
    // Even when the self-review missed its deadline and the lead shared without it.
    const missed = rating({ parEmployeeStatus: "DRAFT", parLeadStatus: "SHARED" });
    expect(landingStep(input({ cycle: { ...cycle, parEmployeeDeadline: PAST }, rating: missed }))).toBe("lead-review");
  });

  it("opens the self-review while the lead reviews and 360° feedback needs nothing from you, never the face-to-face", () => {
    expect(landingStep(input({ rating: rating({ parEmployeeStatus: "SHARED" }), reviewers: asked(3) }))).toBe("self-review");
    const f2fOpen = rating({ parEmployeeStatus: "SHARED", parLeadStatus: "SHARED", parF2fStatus: "PENDING" });
    expect(landingStep(input({ rating: f2fOpen }))).not.toBe("f2f");
  });
});

describe("stepBanner: self-review", () => {
  it("says who sees it once shared, by its deadline, started or not", () => {
    expect(stepBanner(input({ leadName: "Hannah" }), "self-review")).toEqual({
      text: "Hannah sees it once you share it.",
      tone: "todo",
      due: cycle.parEmployeeDeadline,
    });
    const draft = stepBanner(input({ rating: rating({ parEmployeeStatus: "DRAFT" }) }), "self-review");
    expect(draft).toMatchObject({ text: "Your lead sees it once you share it.", tone: "todo" });
  });

  it("says it can still be unshared while it can, without saying when that ends or a date", () => {
    const shared = stepBanner(input({ rating: rating({ parEmployeeStatus: "SHARED" }), leadName: "Hannah" }), "self-review");
    expect(shared).toEqual({ text: "You can still unshare it to make changes.", tone: "done" });
    const locked = rating({ parEmployeeStatus: "SHARED_BLOCKED", parLeadStatus: "DRAFT" });
    expect(stepBanner(input({ rating: locked, leadName: "Hannah" }), "self-review").text).toBe(
      "You'll get an email when Hannah shares their review.",
    );
    const passed = { ...cycle, parEmployeeDeadline: PAST };
    expect(stepBanner(input({ cycle: passed, rating: rating({ parEmployeeStatus: "SHARED" }) }), "self-review").text).toBe(
      "You'll get an email when your lead shares their review.",
    );
  });

  it("doesn't ask for it after its deadline", () => {
    const missed = stepBanner(input({ cycle: { ...cycle, parEmployeeDeadline: PAST } }), "self-review");
    expect(missed).toEqual({ text: CLOSED_NOTE["self-review"], tone: "closed" });
  });
});

describe("stepBanner: 360° feedback", () => {
  const shared = rating({ parEmployeeStatus: "SHARED" });
  const three = (status: Par360Reviewer["reviewStatus"]) => [1, 2, 3].map((n) => reviewer(status, n));

  it("asks for it until three people are asked, then waits on them until the window closes", () => {
    const one = stepBanner(input({ rating: shared, reviewers: [reviewer("PENDING", 1), reviewer("REJECTED", 2)] }), "360");
    expect(one).toEqual({
      text: "Ask at least 3 people who worked closely with you (1 so far).",
      tone: "todo",
      due: cycle.parThreeSixtyRatingDeadline,
    });
    expect(stepBanner(input({ rating: shared, reviewers: three("PENDING") }), "360")).toMatchObject({
      text: "Results show once 3 have answered.",
      tone: "waiting",
      dueLabel: "Open until",
    });
  });

  it("puts feedback others asked you for first once yours needs nothing, counting several", () => {
    const ask = (name: string, isEmployeeRequested = true): Par360ReviewRequest => ({
      employeeEmail: `${name}@x.com`,
      employeeName: name,
      reviewStatus: "PENDING",
      isEmployeeRequested,
      isLeadRequested: false,
    });
    const reviewers = three("SHARED");
    expect(stepBanner(input({ rating: shared, reviewers, requests: [ask("Ann")] }), "360").text).toBe(
      "Ann asked for your feedback. It's in Give feedback.",
    );
    expect(stepBanner(input({ rating: shared, reviewers, requests: [ask("A"), ask("B"), ask("C")] }), "360").text).toBe(
      "3 people asked for your feedback. It's in Give feedback.",
    );
    expect(stepBanner(input({ rating: shared, reviewers, requests: [ask("Ann", false)] }), "360").text).not.toContain(
      "asked for your feedback",
    );
    expect(stepBanner(input({ reviewers: [], requests: [ask("Ann")] }), "360").text).toContain("Ask at least 3 people");
  });

  it("says the minimum is met while more can come in", () => {
    const reviewers = [...three("SHARED"), reviewer("PENDING", 4)];
    expect(stepBanner(input({ rating: shared, reviewers }), "360")).toMatchObject({
      text: "Enough for results. More can still come in.",
      tone: "done",
    });
  });
});

describe("stepBanner: lead review", () => {
  it("is the lead's, expected by their deadline, until they share", () => {
    expect(stepBanner(input({ leadName: "Hannah" }), "lead-review")).toEqual({
      text: "Nothing to do here until you share your self-review.",
      tone: "waiting",
      due: cycle.parLeadDeadline,
      dueLabel: "Expected by",
    });
    for (const parLeadStatus of [undefined, "DRAFT"] as const) {
      const reviewing = rating({ parEmployeeStatus: "SHARED", ...(parLeadStatus && { parLeadStatus }) });
      expect(stepBanner(input({ rating: reviewing, leadName: "Hannah" }), "lead-review").text).toBe(
        "Nothing for you to do yet. You'll get an email when Hannah shares it.",
      );
    }
    // A draft the lead saved before the employee shared doesn't change what the employee is told.
    const early = rating({ parEmployeeStatus: "DRAFT", parLeadStatus: "DRAFT" });
    expect(stepBanner(input({ rating: early, leadName: "Hannah" }), "lead-review").text).toBe(
      "Nothing to do here until you share your self-review.",
    );
    const done = rating({ parEmployeeStatus: "SHARED", parLeadStatus: "SHARED" });
    expect(stepBanner(input({ rating: done, leadName: "Hannah" }), "lead-review")).toEqual({
      text: "Your rating and feedback are here, with your PAR's PDF.",
      tone: "done",
    });
  });
});

describe("stepBanner: face-to-face", () => {
  const leadShared = rating({ parEmployeeStatus: "SHARED_BLOCKED", parLeadStatus: "SHARED" });

  it("opens once the lead shares, then is booked and done", () => {
    expect(stepBanner(input(), "f2f")).toMatchObject({
      text: "Talk it through with your lead once they share, then mark it done.",
      tone: "locked",
    });
    expect(stepBanner(input({ rating: leadShared }), "f2f")).toEqual({
      text: "Find a time with your lead to talk it through, then mark it done.",
      tone: "todo",
      due: cycle.parF2FDeadline,
    });
    expect(stepBanner(input({ rating: { ...leadShared, parF2fStatus: "SCHEDULED" } }), "f2f").text).toBe(
      "Talk it through with your lead, then mark it done.",
    );
    expect(stepBanner(input({ rating: { ...leadShared, parF2fStatus: "COMPLETED" } }), "f2f")).toEqual({
      text: "Your PAR is complete. Download it from Lead review.",
      tone: "done",
    });
  });

  it("doesn't ask to book it after its deadline", () => {
    expect(stepBanner(input({ cycle: { ...cycle, parF2FDeadline: PAST }, rating: leadShared }), "f2f")).toEqual({
      text: CLOSED_NOTE.f2f,
      tone: "closed",
    });
  });
});

describe("deadlines", () => {
  it("ends a deadline everywhere at the end of its day at UTC-12, as the backend does", () => {
    expect(deadlineEndsEverywhereAt("2026-11-10").toISOString()).toBe("2026-11-11T11:59:59.000Z");
  });

  it("says how many days are left", () => {
    const today = new Date(2026, 10, 4);
    expect(daysLeftLabel(daysLeft("2026-11-10", today))).toBe("6 days left");
    expect(daysLeftLabel(daysLeft("2026-11-05", today))).toBe("1 day left");
    expect(daysLeftLabel(daysLeft("2026-11-04", today))).toBe("Due today");
  });
});

describe("homeSteps", () => {
  it("marks the first unfinished step current and counts responses", () => {
    const steps = homeSteps(
      input({ rating: rating({ parEmployeeStatus: "SHARED" }), reviewers: [reviewer("SHARED", 1), reviewer("PENDING", 2)] }),
    );
    expect(steps.map((s) => s.state)).toEqual(["done", "current", "upcoming", "upcoming"]);
    expect(steps[1].detail).toBe("1 of 2 submitted");
  });

  it("counts 360° as done with three responses, without waiting for everyone", () => {
    const reviewers = [reviewer("SHARED", 1), reviewer("SHARED", 2), reviewer("SHARED", 3), reviewer("PENDING", 4)];
    const steps = homeSteps(input({ reviewers }));
    expect(steps[0].state).toBe("current");
    expect(steps[1].state).toBe("done");
  });
});

describe("whose move each step is", () => {
  it("is yours until you share, then waits on your lead, and the F2F opens once they share", () => {
    const steps = homeSteps(input());
    expect(steps.map((s) => s.status)).toEqual(["todo", "todo", "waiting", "locked"]);
    expect(steps[2].waitingOn).toBe("your self-review");
    expect(homeSteps(input({ rating: rating({ parEmployeeStatus: "SHARED" }) }))[2].waitingOn).toBe("your lead");
    const leadShared = rating({ parEmployeeStatus: "SHARED", parLeadStatus: "SHARED" });
    // No 360° feedback was asked for, so that step closed without any.
    expect(homeSteps(input({ rating: leadShared })).map((s) => s.status)).toEqual(["done", "closed", "done", "todo"]);
    const f2fDone = rating({ parEmployeeStatus: "SHARED", parLeadStatus: "SHARED", parF2fStatus: "COMPLETED" });
    expect(homeSteps(input({ rating: f2fDone }))[3].status).toBe("done");
  });

  it("says enough while more 360° answers can still come in, done once everyone answered", () => {
    const three = [reviewer("SHARED", 1), reviewer("SHARED", 2), reviewer("SHARED", 3)];
    expect(homeSteps(input({ reviewers: [...three, reviewer("PENDING", 4)] }))[1].status).toBe("enough");
    expect(homeSteps(input({ reviewers: three }))[1].status).toBe("done");
    const closed = { ...cycle, parThreeSixtyRatingDeadline: PAST };
    expect(homeSteps(input({ cycle: closed, reviewers: [...three, reviewer("PENDING", 4)] }))[1].status).toBe("done");
  });

  it("says whose the lead review and face-to-face are as the cycle moves on", () => {
    const shared = homeSteps(input({ rating: rating({ parEmployeeStatus: "SHARED" }), leadName: "Hannah" }));
    expect(shared[2].detail).toBe("With Hannah");
    // Never when the lead started: a draft reads the same as none, before and after the employee shares.
    const drafted = (parEmployeeStatus: ParRating["parEmployeeStatus"]) =>
      homeSteps(input({ rating: rating({ parEmployeeStatus, parLeadStatus: "DRAFT" }), leadName: "Hannah" }))[2].detail;
    expect(drafted("SHARED_BLOCKED")).toBe("With Hannah");
    expect(drafted("DRAFT")).toBe("Hannah reviews after you share");
    expect(shared[3].detail).toBe("Opens after Hannah shares");
    const leadShared = rating({ parEmployeeStatus: "SHARED", parLeadStatus: "SHARED" });
    const after = homeSteps(input({ rating: leadShared, leadName: "Hannah" }));
    expect(after[2].detail).toBe("Shared with you");
    expect(after[3].detail).toBe("You book it with Hannah");
    expect(homeSteps(input({ rating: leadShared }))[3].detail).toBe("You book it with your lead");
  });

  it("says closed when the 360° window closed without enough feedback", () => {
    const leadShared = rating({ parEmployeeStatus: "SHARED", parLeadStatus: "SHARED" });
    expect(homeSteps(input({ rating: leadShared }))[1]).toMatchObject({ status: "closed", detail: "None requested" });
    const three = [reviewer("SHARED", 1), reviewer("SHARED", 2), reviewer("SHARED", 3)];
    expect(homeSteps(input({ rating: leadShared, reviewers: three }))[1].status).toBe("done");
  });

  it("closes your own steps whose deadline passed before they were finished", () => {
    const passed = { ...cycle, parEmployeeDeadline: PAST, parF2FDeadline: PAST };
    const draft = homeSteps(input({ cycle: passed, rating: rating({ parEmployeeStatus: "DRAFT" }) }));
    expect(draft[0]).toMatchObject({ status: "closed", state: "done", detail: "Not shared by the deadline" });
    expect(draft[1].state).toBe("current");
    // The lead can review without it now.
    expect(draft[2].detail).toBe("With your lead");
    const booked = rating({ parEmployeeStatus: "SHARED", parLeadStatus: "SHARED", parF2fStatus: "SCHEDULED" });
    expect(homeSteps(input({ cycle: passed, rating: booked }))[3]).toMatchObject({
      status: "closed",
      detail: "Not marked done by the deadline",
    });
    const finished = rating({ parEmployeeStatus: "SHARED", parLeadStatus: "SHARED", parF2fStatus: "COMPLETED" });
    expect(homeSteps(input({ cycle: passed, rating: finished })).map((s) => s.status)).toEqual([
      "done",
      "closed",
      "done",
      "done",
    ]);
  });

  it("waits on reviewers once enough people are asked", () => {
    const asked = [reviewer("PENDING", 1), reviewer("PENDING", 2), reviewer("SHARED", 3)];
    const steps = homeSteps(input({ reviewers: asked }));
    expect(steps[1].status).toBe("waiting");
    expect(steps[1].waitingOn).toBe("reviewers");
    expect(homeSteps(input({ reviewers: asked.slice(0, 2) }))[1].status).toBe("todo");
  });
});

describe("a member of the leadership team", () => {
  it("counts Leadership 360° responses for the 360° step, not who they asked", () => {
    const shared = rating({ parEmployeeStatus: "SHARED" });
    const asked = [reviewer("PENDING", 1), reviewer("PENDING", 2), reviewer("PENDING", 3)];
    expect(homeSteps(input({ rating: shared, reviewers: asked, leadership: { responseCount: 2 } }))[1]).toMatchObject({
      state: "current",
      label: "360° feedback",
      detail: "Leadership 360°: 2 submitted",
    });
    expect(homeSteps(input({ rating: shared, leadership: { responseCount: 3 } }))[1].state).toBe("done");
  });

  it("is asked to ask for Leadership 360° feedback", () => {
    const banner = stepBanner(input({ rating: rating({ parEmployeeStatus: "SHARED" }), leadership: { responseCount: 0 } }), "360");
    expect(banner.text).toBe("Ask people who work closely with you. They can answer named or anonymously.");
  });
});
