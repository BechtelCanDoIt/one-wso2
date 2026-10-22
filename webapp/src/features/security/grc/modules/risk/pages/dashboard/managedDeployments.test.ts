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
import type { ManagedServicesRisks, ManagedServicesTheme, RiskScore } from "../../api/riskApi";
import { LEVEL_FALLBACK_COLORS } from "./constants";
import { highSeverityCallout, levelColors, managedSubtitle, maxThemeTotal, themeSegments } from "./managedDeployments";

const theme = (over: Partial<ManagedServicesTheme>): ManagedServicesTheme => ({
  category_id: 1,
  category_name: "Disaster Recovery",
  customers: 1,
  total: 0,
  high: 0,
  medium: 0,
  low: 0,
  ...over,
});

const data = (over: Partial<ManagedServicesRisks>): ManagedServicesRisks => ({
  customer_count: 15,
  open_risks: 57,
  closed_risks: 0,
  high_open: 12,
  high_closed: 0,
  themes: [],
  ...over,
});

const score = (risk_level: RiskScore["risk_level"], color_code: string): RiskScore => ({
  id: 1,
  likelihood: 1,
  impact: 1,
  risk_rating: 1,
  risk_level,
  color_code,
});

describe("levelColors", () => {
  it("uses the configured score colour per level", () => {
    expect(levelColors([score("HIGH", "#111111"), score("HIGH", "#222222")]).HIGH).toBe("#111111");
  });
  it("falls back when a level has no score or colour", () => {
    const got = levelColors([score("LOW", "")]);
    expect(got).toEqual(LEVEL_FALLBACK_COLORS);
  });
});

describe("themeSegments", () => {
  it("keeps only non-empty levels, High first", () => {
    const got = themeSegments(theme({ total: 12, high: 2, medium: 0, low: 10 }), LEVEL_FALLBACK_COLORS);
    expect(got.map((s) => [s.level, s.count])).toEqual([
      ["HIGH", 2],
      ["LOW", 10],
    ]);
  });
  it("colours segments from the given map", () => {
    const got = themeSegments(theme({ total: 2, high: 2 }), { ...LEVEL_FALLBACK_COLORS, HIGH: "#123456" });
    expect(got[0].color).toBe("#123456");
  });
});

describe("maxThemeTotal", () => {
  it("is the largest total", () => {
    expect(maxThemeTotal([theme({ total: 3 }), theme({ total: 12 })])).toBe(12);
  });
  it("is 1 for no themes", () => {
    expect(maxThemeTotal([])).toBe(1);
  });
});

describe("managedSubtitle", () => {
  it("says no closed risks when none are closed", () => {
    expect(managedSubtitle(data({}))).toBe("Risk themes across 15 customers · 57 total open risks · No closed risks");
  });
  it("counts closed risks and singularises", () => {
    expect(managedSubtitle(data({ customer_count: 1, open_risks: 1, closed_risks: 1 }))).toBe(
      "Risk themes across 1 customer · 1 total open risk · 1 closed risk",
    );
  });
});

describe("highSeverityCallout", () => {
  it("reports none closed", () => {
    expect(highSeverityCallout(data({}))).toBe("12 High severity risks — none closed");
  });
  it("reports the closed share", () => {
    expect(highSeverityCallout(data({ high_open: 1, high_closed: 3 }))).toBe("1 High severity risk open — 3 closed");
  });
  it("is null with no High risks", () => {
    expect(highSeverityCallout(data({ high_open: 0 }))).toBeNull();
  });
});
