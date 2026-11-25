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
import { dashboard, myOverview, tripExpenses, upcomingAllocation } from "./engagementMappers";

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

describe("dashboard", () => {
  it("keeps the business date the backend computed for", () => {
    expect(dashboard({ date: "2026-11-24", failedSections: [] }).date).toBe("2026-11-24");
    expect(dashboard({ failedSections: [] }).date).toBeUndefined();
  });

  it("maps the widgets list and leaves it absent for an older backend", () => {
    expect(dashboard({ widgets: [{ id: "waiting-on-you", defaultOn: true }, { id: "tc-lines", defaultOn: false }] }).widgets).toEqual([
      { id: "waiting-on-you", defaultOn: true },
      { id: "tc-lines", defaultOn: false },
    ]);
    expect(dashboard({}).widgets).toBeUndefined();
  });

  it("maps the role stat sections only when the backend sent them", () => {
    expect(dashboard({}).travelTeam).toBeUndefined();
    const d = dashboard({
      failedSections: ["marketingEvents"],
      accountManager: { startedWithoutConsultants: { total: 0, items: [] }, byStatus: [{ label: "New", value: 2 }], byMonth: [{ month: "2026-11", values: { Engagements: 3 } }] },
    });
    expect(d.failed).toEqual(["marketingEvents"]);
    expect(d.accountManager?.byStatus).toEqual([{ label: "New", count: 2 }]);
    expect(d.accountManager?.byMonth).toEqual([{ month: "2026-11", value: 3 }]);
  });
});

describe("myOverview", () => {
  it("maps the trip visas when present", () => {
    const m = myOverview({
      upcomingAllocations: [],
      upcomingTrips: [],
      tripVisas: [{ jobNumber: "TRV-1", country: "India", startDate: "2027-01-10", endDate: "2027-01-20", tripVisa: null, myVisa: null, waiting: true }],
    });
    expect(m.tripVisas).toEqual([{ jobNumber: "TRV-1", country: "India", city: undefined, start: "2027-01-10", end: "2027-01-20", tripVisa: undefined, myVisa: undefined, waiting: true }]);
    expect(myOverview({ upcomingAllocations: [], upcomingTrips: [] }).tripVisas).toBeUndefined();
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
