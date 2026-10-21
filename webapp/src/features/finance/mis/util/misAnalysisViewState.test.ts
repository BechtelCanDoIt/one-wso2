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
import { ANALYSIS_FIRST_SALE, defaultAnalysisFilters, type MisAnalysisFilters } from "./misAnalysisFilters";
import { parseAnalysisView, serializeAnalysisView } from "./misAnalysisViewState";
import { MIS_SCALES } from "./misViewVocabulary";

const TODAY = { year: 2026, month: 9, day: 21 };
const everyFilterSet: MisAnalysisFilters = {
  partnerType: "Channel",
  firstSale: ANALYSIS_FIRST_SALE.ONLY,
  businessUnits: ["IAM", "Choreo"],
  productCounts: [2, 4],
  salesRegions: ["EMEA", "AMER"],
  subRegions: ["UK", "Korea, Republic of"],
  countries: ["Sri Lanka"],
  lifetimeYears: [0, 3, 20],
  arrRange: { lower: 1000, upper: 250000.5 },
  asOf: { year: 2026, month: 3, day: 1 },
};

describe("a Portfolio view in a link", () => {
  it("writes nothing for the view it opens on", () => {
    expect(serializeAnalysisView(defaultAnalysisFilters(TODAY), { scale: MIS_SCALES.UNITS, today: TODAY })).toBe("");
  });

  it("restores every filter and the Scale it was written with", () => {
    const search = serializeAnalysisView(everyFilterSet, { scale: MIS_SCALES.THOUSANDS, today: TODAY });
    expect(parseAnalysisView(search, { today: TODAY })).toEqual({
      filters: everyFilterSet,
      scale: MIS_SCALES.THOUSANDS,
    });
  });

  it("keeps a cleared As Of Date cleared", () => {
    const cleared = { ...defaultAnalysisFilters(TODAY), asOf: null };
    const search = serializeAnalysisView(cleared, { scale: MIS_SCALES.UNITS, today: TODAY });
    expect(parseAnalysisView(search, { today: TODAY }).filters.asOf).toBeNull();
  });
});
