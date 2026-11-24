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
import { dashboard, notConverted, tripExpenses, upcomingAllocation } from "./engagementMappers";

describe("tripExpenses", () => {
  it("names the expense_app statuses and keeps missing values empty", () => {
    const x = tripExpenses({
      cardExpenses: [{ id: 4, date: "2026-11-02", amount: 18.4, currency: "USD", status: "pending_finance" }],
      expenseClaims: [
        { id: 9, claimNumber: "1201", amount: 3000, currency: "LKR", status: "3" },
        { id: 10, status: null, amount: null },
      ],
    });
    expect(x.cardExpenses[0]).toMatchObject({ id: "4", amount: 18.4, status: "Pending Finance" });
    expect(x.expenseClaims[0]).toMatchObject({ id: "9", claimNumber: "1201", status: "Approved" });
    expect(x.expenseClaims[1]).toMatchObject({ status: "—", amount: undefined, date: undefined });
  });

  it("treats missing lists as empty", () => {
    expect(tripExpenses({})).toEqual({ cardExpenses: [], expenseClaims: [] });
  });
});

describe("travel cost notConverted", () => {
  const cost = { total: 10, travelInvoices: 6, perDiems: 4, byMonth: [], byType: [] };

  it("maps each amount with its source, a tidy currency and the line count", () => {
    const d = dashboard({ travelCost: { ...cost, notConverted: [{ source: "claim", currency: " lkr ", amount: 1234500, lines: 12 }, { source: "card", currency: null, amount: 5 }] } });
    expect(d.travelCost?.notConverted).toEqual([
      { source: "claim", currency: "LKR", amount: 1234500, lines: 12 },
      { source: "card", currency: "", amount: 5 },
    ]);
  });

  it("maps an absent or null list to an empty one", () => {
    expect(dashboard({ travelCost: cost }).travelCost?.notConverted).toEqual([]);
    expect(dashboard({ travelCost: { ...cost, notConverted: null } }).travelCost?.notConverted).toEqual([]);
  });

  it("falls back to invoice for a source it does not know", () => {
    expect(notConverted({ source: "other", amount: 1 }).source).toBe("invoice");
  });
});

describe("upcomingAllocation", () => {
  const w = { id: "A1", engagementId: "E1", engagementTitle: "T", startDate: "2026-12-01", endDate: "2026-12-31", current: false };
  it("keeps canOpen undefined when the backend sends none, so the list can answer, and keeps an explicit false", () => {
    expect(upcomingAllocation(w as never).canOpen).toBeUndefined();
    expect(upcomingAllocation({ ...w, canOpen: false } as never).canOpen).toBe(false);
    expect(upcomingAllocation({ ...w, canOpen: true } as never).canOpen).toBe(true);
  });
});
