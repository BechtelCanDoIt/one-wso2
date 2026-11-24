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

import { describe, expect, it } from "vitest";
import { allRatings, ratingSettingsProblem, ruleChoices, withRatingList, type RatingSettings } from "./parRatingSettings";

const DEFAULTS: RatingSettings = {
  employeeRatings: ["Successful", "Needs Improvements"],
  leadershipAllowedRatings: ["Successful", "Step Up"],
  top5p20pEnabledRating: "Successful",
  evidenceEnabledRating: "Needs Improvements",
  missedDeadlineRating: "Needs Improvements",
  leadershipMissedDeadlineRating: "Step Up",
};

describe("ruleChoices", () => {
  it("offers each rule only the ratings it can be", () => {
    expect(ruleChoices(DEFAULTS)).toEqual({
      top5p20pEnabledRating: ["Successful", "Needs Improvements"],
      evidenceEnabledRating: ["Successful", "Needs Improvements", "Step Up"],
      missedDeadlineRating: ["Successful", "Needs Improvements"],
      leadershipMissedDeadlineRating: ["Successful", "Step Up"],
    });
  });

  it("lists every rating once, the leadership group's own last", () => {
    expect(allRatings(DEFAULTS)).toEqual(["Successful", "Needs Improvements", "Step Up"]);
  });
});

describe("withRatingList", () => {
  it("clears each rule whose rating left its list, and keeps the rest", () => {
    const next = withRatingList(DEFAULTS, "employeeRatings", ["Successful"]);
    expect(next).toMatchObject({
      employeeRatings: ["Successful"],
      top5p20pEnabledRating: "Successful",
      evidenceEnabledRating: "",
      missedDeadlineRating: "",
      leadershipMissedDeadlineRating: "Step Up",
    });
    expect(ratingSettingsProblem(next)).toBe("Pick a rating for each rule.");
  });

  it("clears the leadership group's missed-deadline rating when Step Up goes", () => {
    const next = withRatingList(DEFAULTS, "leadershipAllowedRatings", ["Successful"]);
    expect(next.leadershipMissedDeadlineRating).toBe("");
    expect(ratingSettingsProblem(next)).not.toBeNull();
  });

  it("trims names and leaves out blank and repeated ones, whatever the case", () => {
    const next = withRatingList(DEFAULTS, "employeeRatings", [" Successful ", "", "successful", "Needs Improvements"]);
    expect(next.employeeRatings).toEqual(["Successful", "Needs Improvements"]);
  });
});

describe("ratingSettingsProblem", () => {
  it("is none for the defaults", () => {
    expect(ratingSettingsProblem(DEFAULTS)).toBeNull();
  });

  it("needs a rating in each list", () => {
    expect(ratingSettingsProblem({ ...DEFAULTS, employeeRatings: [] })).toBe("Add at least one employee rating.");
    expect(ratingSettingsProblem({ ...DEFAULTS, leadershipAllowedRatings: [] })).toBe(
      "Add at least one rating for the leadership group.",
    );
  });

  it("needs each rule to be one of its choices", () => {
    expect(ratingSettingsProblem({ ...DEFAULTS, top5p20pEnabledRating: "Step Up" })).toBe("Pick a rating for each rule.");
    expect(ratingSettingsProblem({ ...DEFAULTS, leadershipMissedDeadlineRating: "Needs Improvements" })).toBe(
      "Pick a rating for each rule.",
    );
    expect(ratingSettingsProblem({ ...DEFAULTS, evidenceEnabledRating: "Step Up" })).toBeNull();
  });
});
