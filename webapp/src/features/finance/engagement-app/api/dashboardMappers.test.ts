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
import { costDuplicates, costLine, costTransactions, notConverted, travelCosts, travelTeam } from "./dashboardMappers";
import type { WCostLine, WTravelCosts } from "./dashboardWire";

const line: WCostLine = {
  id: "INV-1",
  source: "invoice",
  reference: "INV/2026/0042",
  jobNumber: "TRV-2026-0311",
  traveller: { email: "a@wso2.com", name: "Ada" },
  date: "2026-10-14",
  originalAmount: 152000,
  originalCurrency: "LKR",
  usdAmount: 506.67,
  rate: 300,
  rateDate: "2026-10-31",
  rateSource: "month-end",
  costType: "Air Ticket",
  sourceType: null,
  country: "India",
  travelAgent: { id: 3, name: "Classic Travels" },
  customer: null,
  paid: "paid",
  engagementId: "E-1",
  allocationType: null,
};

const kpi = { value: 10, previous: 8, changePercent: 25, thin: false };
const costs: WTravelCosts = {
  currency: "USD",
  from: "2026-01-01",
  to: "2026-11-24",
  compare: { from: "2025-01-01", to: "2025-11-24" },
  dataAsOf: "2026-11-24T08:15:02Z",
  kpis: { total: kpi, trips: kpi, averagePerTrip: kpi, travellers: kpi, unlinkedSpend: { value: 0, previous: null, changePercent: null, thin: true } },
  bySource: [{ key: "invoice", label: "Travel Invoices", value: 10, percent: 100, previous: 8, changePercent: 25, thin: false }],
  byMonth: [{ month: "2026-10", values: { "Travel Invoices": 10 } }],
  byCountry: [],
  byCustomer: [],
  byTravelAgent: [{ key: "3", label: "Classic Travels", value: 5, percent: 50, thin: false, trips: 2, averagePerTrip: 2.5 }],
  byCostType: [{ key: "Card", label: "Card", value: 1, percent: 10, thin: true, categorised: false }],
  byPaid: [],
  paidSharePercent: null,
};

describe("travelCosts", () => {
  it("keeps the comparison, and reads a missing one as none", () => {
    const t = travelCosts(costs);
    expect(t.compare).toEqual({ from: "2025-01-01", to: "2025-11-24" });
    expect(t.kpis.total).toEqual({ value: 10, previous: 8, changePercent: 25, thin: false });
    expect(t.kpis.unlinkedSpend).toMatchObject({ previous: undefined, changePercent: undefined, thin: true });
    expect(travelCosts({ ...costs, compare: null }).compare).toBeUndefined();
  });

  it("fills what the backend leaves out with empty lists and false", () => {
    const t = travelCosts(costs);
    expect(t.notConverted).toEqual([]);
    expect(t.failedSources).toEqual([]);
    expect(t.truncated).toBe(false);
    expect(t.facets).toEqual({ countries: [], travelAgents: [], customers: [], costTypes: [] });
    expect(t.paidSharePercent).toBeUndefined();
  });

  it("treats a bucket as categorised unless the backend says it is not", () => {
    const t = travelCosts(costs);
    expect(t.byCostType[0].categorised).toBe(false);
    expect(t.bySource[0].categorised).toBe(true);
    expect(t.byTravelAgent[0]).toMatchObject({ trips: 2, averagePerTrip: 2.5 });
  });

  it("maps not-converted amounts with a tidy currency and an unknown source as an invoice", () => {
    expect(notConverted({ source: "claim", currency: " lkr ", amount: 1234500, lines: 12 })).toEqual({ source: "claim", currency: "LKR", amount: 1234500, lines: 12 });
    expect(notConverted({ source: "card", currency: null, amount: 5 })).toEqual({ source: "card", currency: "", amount: 5 });
    expect(notConverted({ source: "other", amount: 1 }).source).toBe("invoice");
    expect(travelCosts({ ...costs, notConverted: [{ source: "claim", currency: "LKR", amount: 3 }], failedSources: ["card"] })).toMatchObject({
      notConverted: [{ source: "claim", currency: "LKR", amount: 3 }],
      failedSources: ["card"],
    });
  });
});

describe("costLine", () => {
  it("keeps the rate and how it was found, and turns null into absent", () => {
    expect(costLine(line)).toMatchObject({ usdAmount: 506.67, rate: 300, rateDate: "2026-10-31", rateSource: "month-end", sourceType: undefined, customer: undefined });
  });

  it("marks a line with no rate as not converted", () => {
    const l = costLine({ ...line, usdAmount: null, rate: null, rateDate: null, rateSource: null });
    expect(l.usdAmount).toBeUndefined();
    expect(l.rate).toBeUndefined();
  });
});

describe("costTransactions", () => {
  it("tells lines from groups", () => {
    const lines = costTransactions({ items: [line], total: 1, totalUsd: 506.67, dataAsOf: "x" });
    expect(lines).toMatchObject({ kind: "lines", total: 1, totalUsd: 506.67 });
    const groups = costTransactions({ groups: [{ key: "India", label: "India", lines: 2, trips: 1, travellers: 1, total: 9, previous: 0, changePercent: null, thin: true }], total: 1, dataAsOf: "x" });
    expect(groups).toMatchObject({ kind: "groups", groups: [{ key: "India", total: 9, thin: true, changePercent: undefined }] });
  });
});

describe("costDuplicates", () => {
  it("maps both lines of a pair", () => {
    const d = costDuplicates({ items: [{ jobNumber: "TRV-1", traveller: null, usdAmount: 500, daysApart: 3, a: line, b: { ...line, id: "CC-2", source: "card" } }], total: 1, dataAsOf: "x" });
    expect(d.items[0]).toMatchObject({ jobNumber: "TRV-1", daysApart: 3, traveller: undefined });
    expect(d.items[0].b.source).toBe("card");
  });
});

describe("travelTeam", () => {
  it("flattens the counts and keeps the age buckets in order", () => {
    const t = travelTeam({
      awayThisWeek: { travellers: 12, countries: 5 },
      endedNotCompleted: { count: 4 },
      poQueue: { count: 9, oldestDays: 41, byAge: [{ label: "Under 7 days", value: 3 }, { label: "7 to 30 days", value: 6 }] },
      frequentTravellers: [{ traveller: { email: "a@wso2.com" }, trips: 7 }],
      agentWorkload: [],
    });
    expect(t.endedNotCompleted).toBe(4);
    expect(t.poQueue.byAge.map((b) => b.label)).toEqual(["Under 7 days", "7 to 30 days"]);
    expect(t.frequentTravellers[0].traveller).toEqual({ email: "a@wso2.com", name: "a@wso2.com" });
  });
});
