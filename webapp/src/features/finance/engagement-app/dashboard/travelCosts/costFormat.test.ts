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
import { engagementServiceUrls } from "@config/apiConfig";
import { deltaCell, deltaText, deltaTone, originalText, rateSourceText, THIN_TEXT, usd0 } from "./costFormat";
import { costCsvName, costCsvUrl } from "./useCostCsv";

describe("deltaText", () => {
  it("never relies on colour: an arrow, the percentage and the words", () => {
    expect(deltaText({ changePercent: 12.5, thin: false }, true)).toBe("▲ 12.5% vs last year");
    expect(deltaText({ changePercent: -8, thin: false }, true)).toBe("▼ 8% vs last year");
    expect(deltaText({ changePercent: 0, thin: false }, true)).toBe("No change vs last year");
  });

  it("says when there is too little to compare, and nothing when comparing is off", () => {
    expect(deltaText({ thin: true }, true)).toBe(THIN_TEXT);
    expect(deltaText({ thin: false }, true)).toBe(THIN_TEXT);
    expect(deltaText({ changePercent: 5, thin: false }, false)).toBeUndefined();
  });

  it("has a short form for a table cell", () => {
    expect(deltaCell({ changePercent: 3, thin: false }, true)).toBe("▲ 3%");
    expect(deltaCell({ thin: true }, true)).toBe("n/a");
    expect(deltaCell({ changePercent: 3, thin: false }, false)).toBe("");
  });
});

describe("a line's amounts", () => {
  it("shows the original amount with its currency, or says the currency is unknown", () => {
    expect(originalText({ originalAmount: 152000, originalCurrency: "LKR" })).toBe("LKR 152,000");
    expect(originalText({ originalAmount: 15, originalCurrency: "" })).toBe("Unknown currency 15.00");
  });

  it("says how the USD amount was found", () => {
    expect(rateSourceText({ rate: 1, rateSource: "recorded" })).toBe("Recorded in USD");
    expect(rateSourceText({ rate: 1, rateSource: "card" })).toBe("Billed to the card in USD");
    expect(rateSourceText({ rate: 300, rateSource: "month-end", rateDate: "2026-10-31" })).toBe("NetSuite's month-end rate");
    expect(rateSourceText({ rate: 300, rateSource: "today" })).toBe("NetSuite's rate today");
    expect(rateSourceText({})).toMatch(/^Not converted/);
  });
});

describe("CSV downloads", () => {
  it("names the file Travel_Costs_<Section>_<from>_<to>.csv", () => {
    expect(costCsvName("summary", { from: "2026-01-01", to: "2026-11-24" })).toBe("Travel_Costs_Summary_2026-01-01_2026-11-24.csv");
    expect(costCsvName("byCountry", { from: "2026-01-01", to: "2026-11-24" })).toBe("Travel_Costs_By_Country_2026-01-01_2026-11-24.csv");
    expect(costCsvName("kpis", { from: "2026-01-01", to: "2026-11-24" })).toBe("Travel_Costs_Key_Figures_2026-01-01_2026-11-24.csv");
  });

  it("asks the summary endpoint for a section and the transactions endpoint for every line", () => {
    const params = { from: "2026-01-01", to: "2026-11-24", source: ["card"] };
    const summary = new URL(costCsvUrl("summary", params), "http://x");
    expect(summary.pathname.endsWith("/dashboard/travel-costs")).toBe(true);
    expect(summary.searchParams.get("format")).toBe("csv");
    expect(summary.searchParams.has("section")).toBe(false);
    expect(new URL(costCsvUrl("byMonth", params), "http://x").searchParams.get("section")).toBe("byMonth");
    const lines = new URL(costCsvUrl("transactions", params), "http://x");
    expect(lines.pathname.endsWith("/dashboard/travel-costs/transactions")).toBe(true);
    expect(lines.searchParams.getAll("source")).toEqual(["card"]);
    expect(engagementServiceUrls.dashboardSections(["travelTeam", "marketingEvents"])).toContain("sections=travelTeam%2CmarketingEvents");
  });
});

describe("deltaTone", () => {
  const d = (changePercent?: number, thin = false) => ({ value: 1, changePercent, thin }) as Parameters<typeof deltaTone>[0];
  it("makes more spend red and less spend green", () => {
    expect(deltaTone(d(12), true, "spend")).toBe("error");
    expect(deltaTone(d(-8), true, "spend")).toBe("success");
  });
  it("never colours volume, no change, thin data or no comparison", () => {
    expect(deltaTone(d(-64), true, "volume")).toBeUndefined();
    expect(deltaTone(d(0), true, "spend")).toBeUndefined();
    expect(deltaTone(d(30, true), true, "spend")).toBeUndefined();
    expect(deltaTone(d(30), false, "spend")).toBeUndefined();
  });
});

describe("usd0", () => {
  it("shows whole dollars with separators, never a short form", () => {
    expect(usd0(12944.22)).toBe("USD 12,944");
    expect(usd0(1410.47)).toBe("USD 1,410");
  });
});
