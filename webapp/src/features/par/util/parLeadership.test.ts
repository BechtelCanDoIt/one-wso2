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
import type { ParCycleConfigurations } from "../api/types";
import { isEvidenceMissing, missedDeadlineRatingFor, ratingOptions } from "./parLeadership";

const RATINGS = ["Needs Improvement", "Successful", "Step Up"];
const LEADERSHIP_ALLOWED = ["Successful", "Step Up"];

describe("ratingOptions", () => {
  it("offers a leadership employee only the leadership-allowed ratings", () => {
    expect(
      ratingOptions(RATINGS, { isLeadership: true, leadershipAllowedRatings: LEADERSHIP_ALLOWED, currentRating: "" }),
    ).toEqual(["Successful", "Step Up"]);
  });

  it("hides Step Up from a non-leadership employee", () => {
    expect(
      ratingOptions(RATINGS, { isLeadership: false, leadershipAllowedRatings: LEADERSHIP_ALLOWED, currentRating: "" }),
    ).toEqual(["Needs Improvement", "Successful"]);
  });

  it("keeps an already-saved rating listed", () => {
    expect(
      ratingOptions(RATINGS, {
        isLeadership: false,
        leadershipAllowedRatings: LEADERSHIP_ALLOWED,
        currentRating: "Step Up",
      }),
    ).toEqual(RATINGS);
    expect(
      ratingOptions(RATINGS, {
        isLeadership: true,
        leadershipAllowedRatings: LEADERSHIP_ALLOWED,
        currentRating: "Needs Improvement",
      }),
    ).toEqual(RATINGS);
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
  const configurations = (overrides: Partial<ParCycleConfigurations> = {}) =>
    ({ parRatings: ["Successful", "Needs Improvements", "Step Up"], ...overrides }) as ParCycleConfigurations;

  it("is Needs Improvements, and Step Up for the leadership team, unless the cycle sets others", () => {
    expect(missedDeadlineRatingFor(configurations(), false)).toBe("Needs Improvements");
    expect(missedDeadlineRatingFor(configurations(), true)).toBe("Step Up");
    expect(missedDeadlineRatingFor(configurations({ missedDeadlineRating: "Successful" }), false)).toBe("Successful");
    expect(missedDeadlineRatingFor(configurations({ leadershipMissedDeadlineRating: "Successful" }), true)).toBe(
      "Successful",
    );
  });

  it("is none when the cycle can't give it", () => {
    expect(missedDeadlineRatingFor(configurations({ parRatings: ["Successful", "Step Up"] }), false)).toBeUndefined();
    expect(missedDeadlineRatingFor(configurations({ parRatings: ["Successful"] }), true)).toBeUndefined();
    expect(missedDeadlineRatingFor(configurations({ leadershipAllowedRatings: ["Successful"] }), true)).toBeUndefined();
    expect(missedDeadlineRatingFor(undefined, false)).toBeUndefined();
  });
});
