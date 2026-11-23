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

import { evidenceEnabledRating as deployEvidenceRating, top5p20pEnabledRating as deployTop5p20pRating } from "@config/apiConfig";
import { isPreviewEnabled } from "@config/previewFeatures";
import type { ParCycleConfigurations } from "../api/types";

/** Ratings the leadership team could be given before a cycle carried its
 * own list. Leadership status is computed server-side and stored once per
 * cycle as ParRating.parIsLeadershipEmployee — read that field directly
 * rather than re-deriving it from org-chart fields like subTeam. */
const OLD_LEADERSHIP_RATINGS = ["Successful", "Step Up"];

/** The rating only the leadership team could be given before a cycle
 * carried its own lists. */
const OLD_LEADERSHIP_ONLY_RATING = "Step Up";

/** A cycle's ratings and the rules that depend on them. A rule is undefined
 * when the cycle doesn't say, so nothing that depends on it applies. */
export interface RatingRules {
  /** Every rating of the cycle, in order. */
  parRatings: string[];
  /** The ratings anyone outside the leadership team can be given. */
  employeeRatings: string[];
  /** The ratings the leadership team can be given. */
  leadershipAllowedRatings: string[];
  /** The rating that unlocks Top 5%/20%. */
  top5p20pEnabledRating?: string;
  /** The rating that needs evidence before it's shared. */
  evidenceEnabledRating?: string;
  /** The rating given for a missed deadline. */
  missedDeadlineRating?: string;
  /** The rating the leadership team is given for a missed deadline. */
  leadershipMissedDeadlineRating?: string;
}

/** A cycle's rating rules. Where `par2` is on, the backend sends every one
 * with the cycle and they're taken as they are. Elsewhere the backend sends
 * only the list, so the deploy's config.js ratings and the rules from before
 * a cycle carried its own fill the rest: Step Up only for the leadership
 * team, who could be given Successful and Step Up, and Needs Improvements
 * (Step Up for the leadership team) for a missed deadline. */
export function ratingRulesFor(configurations: ParCycleConfigurations | undefined): RatingRules {
  const parRatings = configurations?.parRatings ?? [];
  if (isPreviewEnabled("par2")) {
    return {
      parRatings,
      employeeRatings: configurations?.employeeRatings ?? [],
      leadershipAllowedRatings: configurations?.leadershipAllowedRatings ?? [],
      top5p20pEnabledRating: configurations?.top5p20pEnabledRating,
      evidenceEnabledRating: configurations?.evidenceEnabledRating,
      missedDeadlineRating: configurations?.missedDeadlineRating,
      leadershipMissedDeadlineRating: configurations?.leadershipMissedDeadlineRating,
    };
  }
  return {
    parRatings,
    employeeRatings: parRatings.filter((r) => r !== OLD_LEADERSHIP_ONLY_RATING),
    leadershipAllowedRatings: configurations?.leadershipAllowedRatings ?? OLD_LEADERSHIP_RATINGS,
    top5p20pEnabledRating: configurations?.top5p20pEnabledRating ?? deployTop5p20pRating,
    evidenceEnabledRating: configurations?.evidenceEnabledRating ?? deployEvidenceRating,
    missedDeadlineRating: configurations?.missedDeadlineRating ?? "Needs Improvements",
    leadershipMissedDeadlineRating: configurations?.leadershipMissedDeadlineRating ?? "Step Up",
  };
}

/** The rating a PAR gets when its employee doesn't share their self-review by
 * the deadline, as the backend gives it: the cycle's missed-deadline rating,
 * or for the leadership team their own. Undefined when the cycle can't give
 * it (not one of the ratings that group can be given): the backend then
 * leaves that PAR to its lead. */
export function missedDeadlineRatingFor(rules: RatingRules, isLeadership: boolean): string | undefined {
  if (isLeadership) {
    const rating = rules.leadershipMissedDeadlineRating;
    return rating !== undefined && rules.parRatings.includes(rating) && rules.leadershipAllowedRatings.includes(rating)
      ? rating
      : undefined;
  }
  const rating = rules.missedDeadlineRating;
  return rating !== undefined && rules.employeeRatings.includes(rating) ? rating : undefined;
}

/** The rating dropdown's options, in the cycle's order: a leadership employee
 * gets the leadership team's ratings, anyone else the employee ratings. The
 * currently selected rating always stays listed, so a saved value never
 * breaks the select. This only drives which options the dropdown offers --
 * the backend is what actually enforces it. */
export function ratingOptions(
  rules: RatingRules,
  { isLeadership, currentRating }: { isLeadership: boolean; currentRating: string },
): string[] {
  const allowed = isLeadership ? rules.leadershipAllowedRatings : rules.employeeRatings;
  return rules.parRatings.filter((r) => r === currentRating || allowed.includes(r));
}

/** Whether Share is still waiting on the evidence for an evidence-required
 * rating (the confirmation checkbox plus at least one file). A rating the
 * system auto-assigned is locked, so it needs no evidence. */
export function isEvidenceMissing({
  rating,
  evidenceEnabledRating,
  ratingLocked,
  evidenceConfirmed,
  fileCount,
}: {
  rating: string;
  evidenceEnabledRating: string | undefined;
  ratingLocked: boolean;
  evidenceConfirmed: boolean;
  fileCount: number;
}): boolean {
  return rating === evidenceEnabledRating && !ratingLocked && (!evidenceConfirmed || fileCount === 0);
}
