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
  AMPLIFY_PERIOD_PATTERN,
  canPostWith,
  rankDelta,
  safeHttpUrl,
  currentPeriodMonth,
  currentPeriodQuarter,
  formatPeriodLabel,
  periodKind,
} from "./amplifyUi";

// The `period` query value is a shape, not an enum: `ALL`, `YYYY-MM` or
// `YYYY-Qn`. These tests pin the wire format so the UI can never regress to
// sending `MONTH`/`QUARTER` (which the backend answers with 400).

const JAN_2026 = new Date(2026, 0, 15);
const OCT_2026 = new Date(2026, 9, 17);
const DEC_2026 = new Date(2026, 11, 31);

describe("the Amplify period wire format", () => {
  it("accepts only ALL, YYYY-MM and YYYY-Qn", () => {
    expect(AMPLIFY_PERIOD_PATTERN.test("ALL")).toBe(true);
    expect(AMPLIFY_PERIOD_PATTERN.test("2026-10")).toBe(true);
    expect(AMPLIFY_PERIOD_PATTERN.test("2026-Q4")).toBe(true);

    expect(AMPLIFY_PERIOD_PATTERN.test("MONTH")).toBe(false);
    expect(AMPLIFY_PERIOD_PATTERN.test("QUARTER")).toBe(false);
    expect(AMPLIFY_PERIOD_PATTERN.test("YEAR")).toBe(false);
    expect(AMPLIFY_PERIOD_PATTERN.test("2026-13")).toBe(false);
    expect(AMPLIFY_PERIOD_PATTERN.test("2026-Q5")).toBe(false);
  });

  it("reads the kind off a value", () => {
    expect(periodKind("ALL")).toBe("ALL");
    expect(periodKind("2026-10")).toBe("MONTH");
    expect(periodKind("2026-Q4")).toBe("QUARTER");
    // Anything unrecognised falls back to "all time" rather than an invalid query.
    expect(periodKind("MONTH")).toBe("ALL");
  });

  it("builds the current month and quarter as wire values", () => {
    expect(currentPeriodMonth(JAN_2026)).toBe("2026-01");
    expect(currentPeriodMonth(DEC_2026)).toBe("2026-12");
    expect(currentPeriodQuarter(JAN_2026)).toBe("2026-Q1");
    expect(currentPeriodQuarter(OCT_2026)).toBe("2026-Q4");
    expect(currentPeriodQuarter(DEC_2026)).toBe("2026-Q4");
  });

  it("labels values for humans", () => {
    expect(formatPeriodLabel("ALL")).toBe("All time");
    expect(formatPeriodLabel("2026-Q4")).toBe("Q4 2026");
    expect(formatPeriodLabel("2026-10")).toMatch(/Oct/);
  });
});

describe("nullable contract fields", () => {
  // The backend emits `previousRank: null` (not an absent field) for a first
  // ranking; that once rendered as "▼ <rank>".
  it("reads a null or absent previous rank as no movement", () => {
    expect(rankDelta(4, null)).toEqual({ label: "—", dir: "same" });
    expect(rankDelta(4, undefined)).toEqual({ label: "—", dir: "same" });
    expect(rankDelta(null, 3)).toEqual({ label: "—", dir: "same" });
  });

  it("still reports real movement", () => {
    expect(rankDelta(2, 5)).toEqual({ label: "▲ 3", dir: "up" });
    expect(rankDelta(5, 2)).toEqual({ label: "▼ 3", dir: "down" });
  });
});

describe("safeHttpUrl", () => {
  it("passes http(s) and blocks every other scheme", () => {
    expect(safeHttpUrl("https://www.linkedin.com/posts/x")).toBe("https://www.linkedin.com/posts/x");
    expect(safeHttpUrl("http://medium.com/@a/b")).toBe("http://medium.com/@a/b");
    expect(safeHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeHttpUrl(" JavaScript:alert(1)")).toBeUndefined();
    expect(safeHttpUrl("data:text/html,<script>")).toBeUndefined();
    expect(safeHttpUrl("/relative")).toBeUndefined();
    expect(safeHttpUrl(null)).toBeUndefined();
  });
});

describe("canPostWith", () => {
  it("mirrors the backend: ACTIVE and EXPIRING can post", () => {
    expect(canPostWith("ACTIVE")).toBe(true);
    expect(canPostWith("EXPIRING")).toBe(true);
    expect(canPostWith("NEEDS_RECONNECT")).toBe(false);
    expect(canPostWith("REMOVED")).toBe(false);
    expect(canPostWith("NOT_CONNECTED")).toBe(false);
    expect(canPostWith(undefined)).toBe(false);
  });
});
