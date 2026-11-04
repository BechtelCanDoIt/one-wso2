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
import { appliedFilters, dueText, filterQuery, moreCount, NO_FILTERS } from "./deskBoard";

// D130: the board's filters as a query and in words; deadlines in words.
describe("deskBoard", () => {
  it("turns the filters into the backend's query", () => {
    expect(filterQuery(NO_FILTERS).toString()).toBe("");
    const f = { ...NO_FILTERS, q: " acme ", region: "NA", dealType: "RENEWAL", size: "50000-250000", channel: "PARTNER", primaryOnly: "true", currency: "eur" };
    expect(Object.fromEntries(filterQuery(f))).toEqual({
      q: "acme", region: "NA", dealType: "RENEWAL", channel: "PARTNER", currency: "EUR", primaryOnly: "true", valueMin: "50000", valueMax: "250000",
    });
    expect(Object.fromEntries(filterQuery({ ...NO_FILTERS, size: "1000000-" }))).toEqual({ valueMin: "1000000" });
    expect(Object.fromEntries(filterQuery({ ...NO_FILTERS, size: "custom", minValue: "10", maxValue: "" }))).toEqual({ valueMin: "10" });
  });

  it("says what's applied, and counts the More filters", () => {
    const f = { ...NO_FILTERS, q: "acme", region: "NA", dealType: "RENEWAL", am: "jane", submitted: "30" };
    expect(appliedFilters(f)).toEqual(["“acme”", "NA", "Renewal", "AM jane", "Submitted last 30 days"]);
    expect(moreCount(f)).toBe(2);
  });

  it("words a deadline: overdue, soon, or later", () => {
    const now = Date.parse("2026-11-04T09:00:00Z");
    expect(dueText("2026-11-04T03:00:00Z", now)).toEqual({ text: "Overdue 6 h", tone: "late" });
    expect(dueText("2026-11-04T14:00:00Z", now)).toEqual({ text: "Due in 5 h", tone: "soon" });
    expect(dueText("2026-11-06T09:00:00Z", now)).toEqual({ text: "Due in 2 d", tone: "fine" });
  });
});
