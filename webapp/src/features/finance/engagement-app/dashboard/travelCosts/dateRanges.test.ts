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
import { MAX_RANGE_DAYS, previousYear, rangeFor, rangeProblem, recentYears, shiftYears } from "./dateRanges";

describe("rangeFor", () => {
  const today = "2026-11-24";

  it("Year to Date runs from 1 January to today", () => {
    expect(rangeFor("ytd", today)).toEqual({ from: "2026-01-01", to: today });
  });

  it("Last 12 Months is today minus a year plus a day", () => {
    expect(rangeFor("l12m", today)).toEqual({ from: "2025-11-25", to: today });
  });

  it("Last 12 Months on 29 February goes back to 1 March of two years before", () => {
    expect(rangeFor("l12m", "2028-02-29")).toEqual({ from: "2027-03-01", to: "2028-02-29" });
  });

  it("This Quarter starts on the first day of the quarter", () => {
    expect(rangeFor("qtd", today)).toEqual({ from: "2026-10-01", to: today });
    expect(rangeFor("qtd", "2026-01-01")).toEqual({ from: "2026-01-01", to: "2026-01-01" });
    expect(rangeFor("qtd", "2026-03-31").from).toBe("2026-01-01");
    expect(rangeFor("qtd", "2026-04-01").from).toBe("2026-04-01");
  });

  it("Last Quarter is the whole previous one, across the year boundary too", () => {
    expect(rangeFor("lastq", today)).toEqual({ from: "2026-07-01", to: "2026-09-30" });
    expect(rangeFor("lastq", "2026-02-10")).toEqual({ from: "2025-10-01", to: "2025-12-31" });
    expect(rangeFor("lastq", "2026-05-10")).toEqual({ from: "2026-01-01", to: "2026-03-31" });
  });

  it("This Month and Last Month", () => {
    expect(rangeFor("mtd", today)).toEqual({ from: "2026-11-01", to: today });
    expect(rangeFor("lastm", today)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(rangeFor("lastm", "2026-01-15")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(rangeFor("lastm", "2028-03-05")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("Calendar Year is the whole year, last year when none is chosen", () => {
    expect(rangeFor("year", today, { year: 2024 })).toEqual({ from: "2024-01-01", to: "2024-12-31" });
    expect(rangeFor("year", today)).toEqual({ from: "2025-01-01", to: "2025-12-31" });
  });

  it("Custom takes the given dates, or the year to date", () => {
    expect(rangeFor("custom", today, { from: "2026-03-01", to: "2026-03-15" })).toEqual({ from: "2026-03-01", to: "2026-03-15" });
    expect(rangeFor("custom", today)).toEqual({ from: "2026-01-01", to: today });
  });
});

describe("previousYear", () => {
  it("shifts both ends back a year", () => {
    expect(previousYear({ from: "2026-01-01", to: "2026-11-24" })).toEqual({ from: "2025-01-01", to: "2025-11-24" });
  });

  it("turns 29 February into 28 February", () => {
    expect(previousYear({ from: "2028-02-29", to: "2028-03-01" })).toEqual({ from: "2027-02-28", to: "2027-03-01" });
    expect(shiftYears("2027-02-28", 1)).toBe("2028-02-28");
  });
});

describe("rangeProblem", () => {
  it("accepts a normal range and names each problem", () => {
    expect(rangeProblem({ from: "2026-01-01", to: "2026-02-01" })).toBe("");
    expect(rangeProblem({ from: "", to: "2026-02-01" })).toMatch(/start and an end/);
    expect(rangeProblem({ from: "2026-03-01", to: "2026-02-01" })).toMatch(/after the end/);
    expect(rangeProblem({ from: "2024-01-01", to: "2026-02-01" })).toMatch(/two years/);
  });

  it("allows exactly 731 days", () => {
    expect(MAX_RANGE_DAYS).toBe(731);
    expect(rangeProblem({ from: "2024-01-01", to: "2025-12-31" })).toBe("");
    expect(rangeProblem({ from: "2024-01-01", to: "2026-01-01" })).not.toBe("");
  });
});

describe("recentYears", () => {
  it("lists five years, newest first", () => {
    expect(recentYears("2026-11-24")).toEqual([2026, 2025, 2024, 2023, 2022]);
  });
});
