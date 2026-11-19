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

import { isPreviewEnabled } from "@config/previewFeatures";
import { useParRating } from "./useParData";
import { useParticipants, useReviewers, useReviewRequests } from "./usePar360";
import { useSelfReview } from "./useSelfReview";
import { cycleSurvey, useLeadership360Results, useLeadership360Surveys } from "./useLeadership360";
import type { ParCycle } from "./types";
import { isSectionAnswered } from "../util/selfReviewForm";
import type { HomeInput } from "../util/parHome";

/** Everything the tracker works from, loaded; `isLoading` until whatever decides the steps is in. */
export function useHomeInput(cycle: ParCycle, workEmail: string): { input?: HomeInput; isLoading: boolean } {
  const rating = useParRating(cycle.parCycleId, workEmail);
  const selfReview = useSelfReview(cycle.parCycleId, workEmail);
  const reviewers = useReviewers(cycle.parCycleId, workEmail);
  const requests = useReviewRequests(cycle.parCycleId, workEmail);
  // The lead's name for the steps that wait on them: the cycle's people include them.
  const participants = useParticipants(cycle.parCycleId);
  // A leader's 360° feedback is Leadership 360°: what counts is how many responded to the cycle's survey.
  const leader = Boolean(rating.data?.parIsLeadershipEmployee) && isPreviewEnabled("leadership360");
  const surveys = useLeadership360Surveys(leader);
  const leadershipResults = useLeadership360Results(
    leader ? cycleSurvey(surveys.data, cycle.parCycleId)?.surveyId : undefined,
    "SELF",
  );

  const isLoading = rating.isLoading || reviewers.isLoading || (leader && (surveys.isLoading || leadershipResults.isLoading));
  if (!rating.data) return { isLoading: rating.isLoading };

  const definition = selfReview.data?.template.definition;
  const selfReviewProgress = definition && {
    answered: definition.sections.filter((s) => isSectionAnswered(s, selfReview.data!.answers)).length,
    total: definition.sections.length,
  };
  const input: HomeInput = {
    cycle,
    rating: rating.data,
    selfReviewProgress,
    reviewers: reviewers.data ?? [],
    requests: requests.data ?? [],
    leadership: leader ? { responseCount: leadershipResults.data?.[0]?.responseCount ?? 0 } : undefined,
    // First name only: the steps are narrow.
    leadName: participants.data
      ?.find((p) => p.workEmail.toLowerCase() === rating.data!.parLeadEmail?.toLowerCase())
      ?.employeeName.split(" ")[0],
  };
  return { input, isLoading };
}
