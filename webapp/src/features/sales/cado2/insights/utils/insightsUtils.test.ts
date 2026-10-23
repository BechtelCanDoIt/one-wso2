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
import {
  appliedFilters,
  DEFAULT_FILTERS,
  filtersFromSearch,
  filtersToSearch,
  moreFilterCount,
  periodRange,
  reportQuery,
  sizeRange,
} from "./reportFilters";
import { compactMoney, formatHours } from "./format";
import { exportFileName, reportCsv } from "./reportExport";
import type { ReportRow } from "../api/insightsTypes";

const today = new Date(2026, 9, 23); // 23 Oct 2026

describe("report filters and the URL", () => {
  it("round-trips, keeping only what differs from the defaults", () => {
    const f = { ...DEFAULT_FILTERS, q: "northwind", status: "SUBMITTED" as const, region: "NA", dealKind: "RENEWAL" as const, page: 2 };
    const search = filtersToSearch(f);
    expect(search.toString()).toBe("q=northwind&status=SUBMITTED&region=NA&dealKind=RENEWAL&page=2");
    expect(filtersFromSearch(search)).toEqual(f);
    expect(filtersToSearch(DEFAULT_FILTERS).toString()).toBe("");
  });

  it("keeps custom dates and amounts only with a custom choice", () => {
    expect(filtersToSearch({ ...DEFAULT_FILTERS, period: "30", from: "2026-01-01", size: "", minValue: "5" }).toString()).toBe("period=30");
    expect(filtersToSearch({ ...DEFAULT_FILTERS, period: "custom", from: "2026-08-01" }).toString()).toBe("period=custom&from=2026-08-01");
  });

  it("drops what it doesn't know", () => {
    const f = filtersFromSearch(new URLSearchParams("status=MAYBE&channel=X&sort=NOPE&page=-3&from=yesterday&dealKind=FREE"));
    expect(f).toEqual(DEFAULT_FILTERS);
  });
});

describe("periods, sizes and the API query", () => {
  it("turns a period into dates", () => {
    expect(periodRange({ ...DEFAULT_FILTERS, period: "30" }, today)).toEqual({ from: "2026-09-23", to: "" });
    expect(periodRange({ ...DEFAULT_FILTERS, period: "quarter" }, today)).toEqual({ from: "2026-10-01", to: "" });
    expect(periodRange({ ...DEFAULT_FILTERS, period: "year" }, today)).toEqual({ from: "2026-01-01", to: "" });
    expect(periodRange({ ...DEFAULT_FILTERS, period: "custom", from: "2026-08-01", to: "2026-09-30" }, today)).toEqual({
      from: "2026-08-01",
      to: "2026-09-30",
    });
    expect(periodRange(DEFAULT_FILTERS, today)).toEqual({ from: "", to: "" });
  });

  it("turns a deal-size band into a range", () => {
    expect(sizeRange({ ...DEFAULT_FILTERS, size: "50000-250000" })).toEqual({ min: "50000", max: "250000" });
    expect(sizeRange({ ...DEFAULT_FILTERS, size: "1000000-" })).toEqual({ min: "1000000", max: "" });
    expect(sizeRange({ ...DEFAULT_FILTERS, size: "custom", minValue: "10", maxValue: "" })).toEqual({ min: "10", max: "" });
  });

  it("builds the API query", () => {
    expect(reportQuery(DEFAULT_FILTERS, 3, 50, today)).toBe("sort=CREATED&order=desc&page=3&pageSize=50");
    const q = new URLSearchParams(
      reportQuery({ ...DEFAULT_FILTERS, q: "acme", status: "APPROVED", region: "EU", period: "90", dateField: "APPROVED",
        dealKind: "EXPANSION", channel: "PARTNER", waitingOn: "CFO", size: "50000-250000" }, 1, 5000, today),
    );
    expect(Object.fromEntries(q)).toEqual({
      q: "acme", statuses: "APPROVED", regions: "EU", dateField: "APPROVED", from: "2026-07-25", dealKinds: "EXPANSION",
      channel: "PARTNER", waitingOn: "CFO", minValue: "50000", maxValue: "249999.99", sort: "CREATED", order: "desc", page: "1",
      pageSize: "5000",
    });
  });

  it("says what's applied, and counts what's inside More filters", () => {
    const f = { ...DEFAULT_FILTERS, status: "SUBMITTED" as const, period: "custom" as const, from: "2026-08-01", to: "2026-09-30",
      dealKind: "RENEWAL" as const, size: "250000-1000000" as const };
    expect(appliedFilters(f)).toEqual(["In approval", "Submitted 1 Aug 2026 – 30 Sept 2026", "Renewal", "$250K – $1M"]);
    expect(moreFilterCount(f)).toBe(2);
    expect(appliedFilters({ ...DEFAULT_FILTERS, size: "custom", minValue: "100000" })).toEqual(["$100,000 – any"]);
  });
});

describe("formatting", () => {
  it("shortens headline amounts", () => {
    expect(compactMoney("4200000.00", "USD")).toBe("USD 4.2M");
    expect(compactMoney("830000", "USD")).toBe("USD 830K");
    expect(compactMoney(null, "USD")).toBe("—");
  });

  it("reads durations", () => {
    expect(formatHours(0.5)).toBe("30 min");
    expect(formatHours(6.54)).toBe("6.5 h");
    expect(formatHours(43.2)).toBe("1.8 days");
    expect(formatHours(24)).toBe("1 day");
    expect(formatHours(null)).toBe("—");
  });
});

describe("export", () => {
  const row: ReportRow = {
    quoteId: 7, quoteNumber: "Q-26-00007", versionNumber: 2, status: "SUBMITTED", accountName: "Northwind, Inc.",
    opportunityName: "Renewal 2027", region: "NA", partnerName: null, channel: "DIRECT", dealKind: "RENEWAL", recordTypeName: "Renewal", currency: "EUR",
    tcv: "80000.00", tcvConverted: "100000.00", arrConverted: "33333.33", maxDiscretionaryPercent: "12.50",
    ownerEmail: "rep@wso2.com", createdAt: "2026-10-01T09:00:00Z", submittedAt: "2026-10-02T09:00:00Z", approvedAt: null,
    daysInApproval: 1.5, waitingOn: ["Deal Desk", "Legal"],
  };

  it("writes CSV with the converted columns and amounts as numbers", () => {
    const csv = reportCsv([row], "USD").split("\r\n");
    expect(csv[0]).toContain("TCV (USD)");
    expect(csv[1]).toContain('"Northwind, Inc."');
    expect(csv[1]).toContain("In approval");
    expect(csv[1]).toContain("Deal Desk, Legal");
    expect(csv[1]).toContain(",100000,");
    expect(csv[1]).toContain("2026-10-02T09:00:00.000Z");
  });

  it("names the file by date", () => {
    expect(exportFileName("xlsx", new Date("2026-10-22T10:00:00Z"))).toBe("cado2-quotes-2026-10-22.xlsx");
  });
});
