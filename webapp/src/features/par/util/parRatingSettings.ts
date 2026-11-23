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

import type { ParCycleConfigurations } from "../api/types";

/** The ratings People Ops set for a new cycle or as the global configurations,
 * and the rules that depend on them. A rule is "" until one is picked. */
export interface RatingSettings {
  /** The ratings anyone outside the leadership group can be given. */
  employeeRatings: string[];
  /** The ratings the leadership group can be given. */
  leadershipAllowedRatings: string[];
  /** The rating that unlocks Top 5%/20%: an employee rating. */
  top5p20pEnabledRating: string;
  /** The rating that needs evidence before it's shared: any rating. */
  evidenceEnabledRating: string;
  /** The rating given for a missed deadline: an employee rating. */
  missedDeadlineRating: string;
  /** The same for the leadership group: one of theirs. */
  leadershipMissedDeadlineRating: string;
}

/** A rule's field in RatingSettings. */
export type RatingRule = "top5p20pEnabledRating" | "evidenceEnabledRating" | "missedDeadlineRating" | "leadershipMissedDeadlineRating";

/** Every rule, in the order they're shown. */
export const RATING_RULES: RatingRule[] = [
  "top5p20pEnabledRating",
  "evidenceEnabledRating",
  "missedDeadlineRating",
  "leadershipMissedDeadlineRating",
];

/** The settings in the global configurations, which the backend sends with every value filled in. */
export function ratingSettingsFrom(configurations: ParCycleConfigurations | undefined): RatingSettings {
  return {
    employeeRatings: configurations?.employeeRatings ?? [],
    leadershipAllowedRatings: configurations?.leadershipAllowedRatings ?? [],
    top5p20pEnabledRating: configurations?.top5p20pEnabledRating ?? "",
    evidenceEnabledRating: configurations?.evidenceEnabledRating ?? "",
    missedDeadlineRating: configurations?.missedDeadlineRating ?? "",
    leadershipMissedDeadlineRating: configurations?.leadershipMissedDeadlineRating ?? "",
  };
}

/** Every rating: the employee ratings, then the ones only the leadership group gets. */
export function allRatings(settings: RatingSettings): string[] {
  return [
    ...settings.employeeRatings,
    ...settings.leadershipAllowedRatings.filter((r) => !settings.employeeRatings.includes(r)),
  ];
}

/** The ratings each rule can be: Top 5%/20% and the missed-deadline rating
 * are employee ratings (the leadership group can't get Top 5%/20%), the
 * leadership group's missed-deadline rating is one of theirs, and evidence
 * can go with any. */
export function ruleChoices(settings: RatingSettings): Record<RatingRule, string[]> {
  return {
    top5p20pEnabledRating: settings.employeeRatings,
    evidenceEnabledRating: allRatings(settings),
    missedDeadlineRating: settings.employeeRatings,
    leadershipMissedDeadlineRating: settings.leadershipAllowedRatings,
  };
}

/** The settings with a list changed: names are trimmed, a blank or repeated
 * one (whatever the case) is left out, and a rule that's no longer one of its
 * choices is cleared, to be picked again. */
export function withRatingList(
  settings: RatingSettings,
  list: "employeeRatings" | "leadershipAllowedRatings",
  ratings: string[],
): RatingSettings {
  const kept: string[] = [];
  for (const rating of ratings.map((r) => r.trim())) {
    if (rating && !kept.some((k) => k.toLowerCase() === rating.toLowerCase())) kept.push(rating);
  }
  const next = { ...settings, [list]: kept };
  const choices = ruleChoices(next);
  for (const rule of RATING_RULES) {
    if (!choices[rule].includes(next[rule])) next[rule] = "";
  }
  return next;
}

/** Why the settings can't be saved yet, or null when they can. */
export function ratingSettingsProblem(settings: RatingSettings): string | null {
  if (settings.employeeRatings.length === 0) return "Add at least one employee rating.";
  if (settings.leadershipAllowedRatings.length === 0) return "Add at least one rating for the leadership group.";
  const choices = ruleChoices(settings);
  if (RATING_RULES.some((rule) => !choices[rule].includes(settings[rule]))) return "Pick a rating for each rule.";
  return null;
}
