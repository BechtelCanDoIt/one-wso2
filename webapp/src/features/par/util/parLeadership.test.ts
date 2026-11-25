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

import { afterEach, describe, expect, it } from "vitest";
import type { ParCycleConfigurations } from "../api/types";
import { isEvidenceMissing, missedDeadlineRatingFor, ratingOptions, ratingRulesFor, type RatingRules } from "./parLeadership";

const originalConfig = window.config;
const setPar2 = (on: boolean) => {
  window.config = { ...(originalConfig ?? {}), ONE_WSO2_PREVIEW_FEATURES: { par2: on } } as Window["config"];
};
afterEach(() => {
  window.config = originalConfig;
});

const RULES: RatingRules = {
  parRatings: ["Needs Improvements", "Successful", "Step Up"],
  employeeRatings: ["Needs Improvements", "Successful"],
  leadershipAllowedRatings: ["Successful", "Step Up"],
  top5p20pEnabledRating: "Successful",
  evidenceEnabledRating: "Needs Improvements",
  missedDeadlineRating: "Needs Improvements",
  leadershipMissedDeadlineRating: "Step Up",
};

describe("ratingRulesFor", () => {
  const sent: ParCycleConfigurations = {
    employeeParQuestion: "",
    threeSixtyReviewQuestion: "",
    parRatings: ["Great", "Needs Improvements", "Outstanding"],
    threeSixtyReviewRatings: [],
    employeeRatings: ["Great", "Needs Improvements"],
    leadershipAllowedRatings: ["Great", "Outstanding"],
    top5p20pEnabledRating: "Great",
    evidenceEnabledRating: "Needs Improvements",
    missedDeadlineRating: "Needs Improvements",
    leadershipMissedDeadlineRating: "Outstanding",
  };

  it("takes the cycle's own lists and rules with par2 on, and adds none of its own", () => {
    setPar2(true);
    expect(ratingRulesFor(sent)).toEqual({
      parRatings: sent.parRatings,
      employeeRatings: sent.employeeRatings,
      leadershipAllowedRatings: sent.leadershipAllowedRatings,
      top5p20pEnabledRating: "Great",
      evidenceEnabledRating: "Needs Improvements",
      missedDeadlineRating: "Needs Improvements",
      leadershipMissedDeadlineRating: "Outstanding",
    });
    const listOnly = { parRatings: ["Successful", "Step Up"] } as ParCycleConfigurations;
    expect(ratingRulesFor(listOnly)).toMatchObject({ employeeRatings: [], top5p20pEnabledRating: undefined });
  });

  it("fills a list-only cycle with the old rules with par2 off", () => {
    setPar2(false);
    const listOnly = { parRatings: ["Successful", "Needs Improvements", "Step Up"] } as ParCycleConfigurations;
    expect(ratingRulesFor(listOnly)).toMatchObject({
      employeeRatings: ["Successful", "Needs Improvements"],
      leadershipAllowedRatings: ["Successful", "Step Up"],
      top5p20pEnabledRating: "Successful",
      missedDeadlineRating: "Needs Improvements",
      leadershipMissedDeadlineRating: "Step Up",
    });
  });

  it("takes the lists and rules a cycle carries with par2 off", () => {
    setPar2(false);
    expect(ratingRulesFor(sent)).toMatchObject({
      employeeRatings: ["Great", "Needs Improvements"],
      leadershipAllowedRatings: ["Great", "Outstanding"],
      top5p20pEnabledRating: "Great",
      leadershipMissedDeadlineRating: "Outstanding",
    });
    // "Outstanding" is only the leadership group's, whatever the old rules say.
    expect(ratingOptions(ratingRulesFor(sent), { isLeadership: false, currentRating: "" })).toEqual([
      "Great",
      "Needs Improvements",
    ]);
  });
});

describe("ratingOptions", () => {
  it("offers a leadership employee only the leadership team's ratings", () => {
    expect(ratingOptions(RULES, { isLeadership: true, currentRating: "" })).toEqual(["Successful", "Step Up"]);
  });

  it("offers anyone else only the employee ratings", () => {
    expect(ratingOptions(RULES, { isLeadership: false, currentRating: "" })).toEqual([
      "Needs Improvements",
      "Successful",
    ]);
  });

  it("keeps an already-saved rating listed", () => {
    expect(ratingOptions(RULES, { isLeadership: false, currentRating: "Step Up" })).toEqual(RULES.parRatings);
    expect(ratingOptions(RULES, { isLeadership: true, currentRating: "Needs Improvements" })).toEqual(RULES.parRatings);
  });
});

describe("isEvidenceMissing", () => {
  const base = {
    rating: "Needs Improvement",
    evidenceEnabledRating: "Needs Improvement",
    ratingLocked: false,
    evidenceConfirmed: false,
    fileCount: 0,
  };

  it("requires the checkbox and a file for the evidence rating", () => {
    expect(isEvidenceMissing(base)).toBe(true);
    expect(isEvidenceMissing({ ...base, evidenceConfirmed: true })).toBe(true);
    expect(isEvidenceMissing({ ...base, fileCount: 1 })).toBe(true);
    expect(isEvidenceMissing({ ...base, evidenceConfirmed: true, fileCount: 1 })).toBe(false);
  });

  it("needs no evidence for an auto-assigned, locked rating", () => {
    expect(isEvidenceMissing({ ...base, ratingLocked: true })).toBe(false);
  });

  it("needs no evidence for other ratings", () => {
    expect(isEvidenceMissing({ ...base, rating: "Successful" })).toBe(false);
  });
});

describe("missedDeadlineRatingFor", () => {
  it("is the cycle's rating for its group", () => {
    expect(missedDeadlineRatingFor(RULES, false)).toBe("Needs Improvements");
    expect(missedDeadlineRatingFor(RULES, true)).toBe("Step Up");
    expect(missedDeadlineRatingFor({ ...RULES, leadershipMissedDeadlineRating: "Successful" }, true)).toBe("Successful");
  });

  it("is none when the cycle can't give it", () => {
    expect(missedDeadlineRatingFor({ ...RULES, employeeRatings: ["Successful"] }, false)).toBeUndefined();
    expect(missedDeadlineRatingFor({ ...RULES, leadershipAllowedRatings: ["Successful"] }, true)).toBeUndefined();
    expect(missedDeadlineRatingFor({ ...RULES, missedDeadlineRating: undefined }, false)).toBeUndefined();
  });
});
