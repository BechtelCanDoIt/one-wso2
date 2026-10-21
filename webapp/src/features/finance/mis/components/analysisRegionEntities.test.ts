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

// What the two breakdowns above the account table are made of, as data.

import { describe, expect, it } from "vitest";
import { analysisRegionEntities, OTHER_ENTITY, UNSPECIFIED_ENTITY } from "./analysisRegionEntities";
import type { AnalysisAccountRow } from "./analysisAccountRows";

const account = (
  salesRegion: string,
  subRegion: string,
  totalArr: number,
): Pick<AnalysisAccountRow, "salesRegion" | "subRegion" | "totalArr"> => ({
  salesRegion,
  subRegion,
  totalArr,
});

const rows = [
  account("EMEA", "UK", 500),
  account("EMEA", "DACH", 200),
  account("AMER", "US East", 900),
  account("APAC", "ANZ", 100),
];

describe("analysisRegionEntities", () => {
  it("cuts by region when no region filter is applied", () => {
    const { label, order } = analysisRegionEntities(rows, { bySubRegion: false });
    expect(label).toBe("Region");
    expect(order.map((entity) => entity.name)).toEqual(["AMER", "EMEA", "APAC"]);
  });

  it("cuts by sub-region when a region filter is applied", () => {
    const { label, order } = analysisRegionEntities(rows, { bySubRegion: true });
    expect(label).toBe("Sub Region");
    expect(order.map((entity) => entity.name)).toEqual(["US East", "UK", "DACH", "ANZ"]);
  });

  it("ranks entities by total ARR and gives each its rank as its hue", () => {
    const { order } = analysisRegionEntities(rows, { bySubRegion: false });
    expect(order.map((entity) => entity.rank)).toEqual([0, 1, 2]);
  });

  it("names the top five and folds the rest into one Other with no hue rank", () => {
    const seven = ["A", "B", "C", "D", "E", "F", "G"].map((name, index) =>
      account(name, "", 700 - index * 100),
    );
    const entities = analysisRegionEntities(seven, { bySubRegion: false });
    expect(entities.order.map((entity) => entity.name)).toEqual(["A", "B", "C", "D", "E", OTHER_ENTITY]);
    expect(entities.order.at(-1)?.rank).toBeNull();
    expect(entities.bucketOf(seven[4]!)).toBe("E");
    expect(entities.bucketOf(seven[5]!)).toBe(OTHER_ENTITY);
    expect(entities.bucketOf(seven[6]!)).toBe(OTHER_ENTITY);
  });

  it("names an account with no region Unspecified", () => {
    const entities = analysisRegionEntities([account("  ", "", 10)], { bySubRegion: false });
    expect(entities.bucketOf(account("", "", 10))).toBe(UNSPECIFIED_ENTITY);
    expect(entities.order.map((entity) => entity.name)).toEqual([UNSPECIFIED_ENTITY]);
  });

  it("has no entities for no accounts", () => {
    expect(analysisRegionEntities([], { bySubRegion: false }).order).toEqual([]);
  });
});
