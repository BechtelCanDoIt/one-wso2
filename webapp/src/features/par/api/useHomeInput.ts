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
import { useReviewers } from "./usePar360";
import { useReviewCount } from "./useReview360";
import { cycleSurvey, useLeadership360Results, useLeadership360Surveys } from "./useLeadership360";
import type { ParCycle } from "./types";
import type { HomeInput } from "../util/parHome";

/** Everything the tracker works from, loaded; `isLoading` until whatever decides the steps is in. */
export function useHomeInput(cycle: ParCycle, workEmail: string): { input?: HomeInput; isLoading: boolean } {
  const rating = useParRating(cycle.parCycleId, workEmail);
  const reviewers = useReviewers(cycle.parCycleId, workEmail);
  // A leader's 360° feedback is Leadership 360°: what counts is how many responded to the cycle's survey.
  const leader = Boolean(rating.data?.parIsLeadershipEmployee) && isPreviewEnabled("leadership360");
  const surveys = useLeadership360Surveys(leader);
  const leadershipResults = useLeadership360Results(
    leader ? cycleSurvey(surveys.data, cycle.parCycleId)?.surveyId : undefined,
    "SELF",
  );
  // A member's received count includes feedback offered unasked, which their list of reviewers leaves out.
  const count = useReviewCount(cycle.parCycleId, workEmail, Boolean(rating.data) && !leader);

  const isLoading = rating.isLoading || reviewers.isLoading || (leader && (surveys.isLoading || leadershipResults.isLoading));
  if (!rating.data) return { isLoading: rating.isLoading };

  const input: HomeInput = {
    cycle,
    rating: rating.data,
    reviewers: reviewers.data ?? [],
    received: count.data?.received,
    leadership: leader ? { responseCount: leadershipResults.data?.[0]?.responseCount ?? 0 } : undefined,
  };
  return { input, isLoading };
}
