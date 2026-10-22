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

describe("a Portfolio link with values it cannot use", () => {
  const opened = (search: string) => parseAnalysisView(search, { today: TODAY });
  const defaults = defaultAnalysisFilters(TODAY);

  it.each([
    ["an unknown first sale", "firstSale=maybe"],
    ["a Business Unit the control does not offer", "bu=Hardware"],
    ["both API Platform and Moesif", "bu=API%20Platform,Moesif"],
    ["a product count out of range", "productsInUse=0,9,x"],
    ["a lifetime out of range", "lifetime=-1,21,1.5"],
    ["a non-numeric ARR bound", "arrMin=lots&arrMax=Infinity"],
    ["an empty ARR bound", "arrMin=&arrMax="],
    ["an impossible As Of Date", "asOf=2026-02-31"],
    ["a malformed As Of Date", "asOf=yesterday"],
    ["a Scale it does not know", "scale=millions"],
    ["an empty list", "region=,,"],
    ["a partner type that is not a plain name", "partner=%3Cscript%3Ealert(1)%3C/script%3E"],
  ])("opens on the defaults for %s", (_, search) => {
    expect(opened(search)).toEqual({ filters: defaults, scale: undefined });
  });

  it("accepts a partner type with punctuation and rejects markup", () => {
    expect(opened("partner=Reseller%20%2F%20Distributor%2C%20Inc.").filters.partnerType).toBe("Reseller / Distributor, Inc.");
    expect(opened("partner=a%3Cb").filters.partnerType).toBe("all");
  });

  it("keeps the valid values beside an invalid one", () => {
    expect(opened("region=EMEA&firstSale=maybe&bu=IAM,Hardware").filters).toEqual({
      ...defaults,
      salesRegions: ["EMEA"],
      businessUnits: ["IAM"],
    });
  });

  it("drops a product count the Business Units make impossible", () => {
    expect(opened("bu=IAM,Choreo,Moesif&productsInUse=1,3").filters.productCounts).toEqual([3]);
  });

  it("ignores a lower ARR bound above the upper one", () => {
    expect(opened("arrMin=500&arrMax=100").filters.arrRange).toEqual({ lower: null, upper: null });
  });

  it("caps how many values a list takes and how long each may be", () => {
    const tooMany = Array.from({ length: 200 }, (_, i) => `R${i}`).join(",");
    expect(opened(`region=${tooMany}`).filters.salesRegions).toHaveLength(50);
    expect(opened(`region=${"x".repeat(500)}`).filters.salesRegions).toEqual([]);
  });

  it.each([
    ["region", "salesRegions"],
    ["subRegion", "subRegions"],
    ["country", "countries"],
  ] as const)("drops markup and control characters from the %s list", (key, field) => {
    expect(opened(`${key}=EMEA,%3Cscript%3E,APAC%00,Sri%20Lanka`).filters[field]).toEqual(["EMEA", "Sri Lanka"]);
    expect(opened(`${key}=%3Cb%3E`).filters[field]).toEqual([]);
  });
});

describe("a Portfolio link naming places the backend does not offer", () => {
  const offered = { salesRegions: ["EU", "NA", "APAC"], subRegions: ["UK", "DACH"], countries: ["Sri Lanka", "Germany"] };
  const opened = (search: string) => parseAnalysisView(search, { today: TODAY, offered });
  const defaults = defaultAnalysisFilters(TODAY);

  it("keeps a Sales Region the backend offers", () => {
    expect(opened("region=EU").filters.salesRegions).toEqual(["EU"]);
  });

  it("drops a Sales Region the backend does not offer", () => {
    expect(opened("region=EU,EMEA,NA").filters.salesRegions).toEqual(["EU", "NA"]);
  });

  it("opens on the default when no Sales Region in the link is offered", () => {
    expect(opened("region=EMEA").filters.salesRegions).toEqual(defaults.salesRegions);
    expect(opened("region=EMEA,Americas").filters).toEqual(defaults);
  });

  it.each([
    ["subRegion", "subRegions", "UK", "Atlantis"],
    ["country", "countries", "Sri Lanka", "Narnia"],
  ] as const)("holds the %s list to what the backend offers too", (key, field, real, fake) => {
    expect(opened(`${key}=${real},${fake}`).filters[field]).toEqual([real]);
    expect(opened(`${key}=${fake}`).filters[field]).toEqual([]);
  });

  it("takes any safe name when the backend offered no list for it", () => {
    const noRegions = { ...offered, salesRegions: [] };
    expect(parseAnalysisView("region=EMEA", { today: TODAY, offered: noRegions }).filters.salesRegions).toEqual(["EMEA"]);
  });
});
