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
import { costParams, drillPatch, filterCount, patchCostView, readCostView, transactionParams } from "./costView";

const today = "2026-11-24";

describe("readCostView", () => {
  it("is Year to Date, compared, as charts, newest first, with no filters, when the address says nothing", () => {
    const v = readCostView({}, today);
    expect(v).toMatchObject({ range: "ytd", compare: true, mode: "charts", sort: "-date", page: 0, group: undefined });
    expect(v.period).toEqual({ from: "2026-01-01", to: today });
    expect(v.filters).toEqual({});
  });

  it("reads a preset, a calendar year and a custom range", () => {
    expect(readCostView({ tcRange: "lastq" }, today).period).toEqual({ from: "2026-07-01", to: "2026-09-30" });
    expect(readCostView({ tcRange: "year", tcYear: "2024" }, today).period).toEqual({ from: "2024-01-01", to: "2024-12-31" });
    expect(readCostView({ tcRange: "custom", tcFrom: "2026-03-01", tcTo: "2026-03-31" }, today).period).toEqual({ from: "2026-03-01", to: "2026-03-31" });
  });

  it("reads unknown or malformed values as the default", () => {
    const v = readCostView({ tcRange: "forever", tcYear: "abcd", tcView: "pie", tcSort: "x", tcGroup: "colour", tcPage: "-4" }, today);
    expect(v).toMatchObject({ range: "ytd", year: undefined, mode: "charts", sort: "-date", group: undefined, page: 0 });
    expect(readCostView({ tcRange: "custom", tcFrom: "tomorrow", tcTo: "2026-03-01" }, today).period.from).toBe("2026-01-01");
  });

  it("reads comparison off, tables, group, sort, page and comma-joined filters", () => {
    const v = readCostView({ tcCompare: "0", tcView: "tables", tcGroup: "country", tcSort: "-amount", tcPage: "2", tcSource: "invoice,card", tcAgent: "0,3" }, today);
    expect(v).toMatchObject({ compare: false, mode: "tables", group: "country", sort: "-amount", page: 2 });
    expect(v.filters).toEqual({ tcSource: ["invoice", "card"], tcAgent: ["0", "3"] });
    expect(filterCount(v)).toBe(2);
  });
});

describe("patchCostView", () => {
  it("keeps every key it does not own", () => {
    const next = patchCostView({ businessUnit: "Sales", date: "2026-11-01", tcRange: "mtd" }, { tcRange: "lastm" });
    expect(next).toEqual({ businessUnit: "Sales", date: "2026-11-01", tcRange: "lastm" });
  });

  it("removes a key set to undefined or empty", () => {
    expect(patchCostView({ tcRange: "mtd", tcSource: "card" }, { tcRange: undefined, tcSource: "" })).toEqual({});
  });

  it("sends the Transactions back to the first page for any change but the page", () => {
    expect(patchCostView({ tcPage: "3", tcSource: "card" }, { tcSource: "invoice" })).toEqual({ tcSource: "invoice" });
    expect(patchCostView({ tcPage: "3" }, { tcPage: "4" })).toEqual({ tcPage: "4" });
    expect(patchCostView({ tcPage: "3" }, { tcPage: undefined })).toEqual({});
  });
});

describe("drill-down", () => {
  it("sets that filter to the one value, replacing its others, and resets the page", () => {
    const view = { tcCountry: "India,Japan", tcPage: "2", tcSource: "card", date: "2026-11-01" };
    expect(patchCostView(view, drillPatch("tcCountry", "Sri Lanka"))).toEqual({ tcCountry: "Sri Lanka", tcSource: "card", date: "2026-11-01" });
  });

  it("shows up as a filter chip the person can remove", () => {
    const v = readCostView(patchCostView({}, drillPatch("tcAgent", "3")), today);
    expect(v.filters.tcAgent).toEqual(["3"]);
  });
});

describe("costParams", () => {
  it("sends the range and nothing else for a plain view", () => {
    expect(costParams(readCostView({}, today))).toEqual({ from: "2026-01-01", to: today, compare: undefined });
  });

  it("sends compare=false when off, each filter by its API name, and unlinked as true", () => {
    const p = costParams(readCostView({ tcCompare: "0", tcSource: "card", tcJob: "TRV-1,TRV-2", tcAgent: "0", tcUnlinked: "1", tcCostType: "Air Ticket" }, today));
    expect(p).toMatchObject({ compare: false, source: ["card"], jobNumber: ["TRV-1", "TRV-2"], travelAgent: ["0"], unlinked: "true", costType: ["Air Ticket"] });
  });

  it("adds Group By, Sort and the page for the Transactions", () => {
    const p = transactionParams(readCostView({ tcGroup: "month", tcSort: "amount", tcPage: "2" }, today));
    expect(p).toMatchObject({ groupBy: "month", sort: "amount", limit: 25, offset: 50 });
    expect(transactionParams(readCostView({}, today)).sort).toBeUndefined();
  });
});
