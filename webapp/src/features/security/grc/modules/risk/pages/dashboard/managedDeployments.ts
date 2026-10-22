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

// Pure helpers behind the "Most Common Risks — Managed Deployments" card.

import type { ManagedServicesRisks, ManagedServicesTheme, RiskScore } from "../../api/riskApi";
import { LEVEL_FALLBACK_COLORS } from "./constants";

export interface ThemeSegment {
  level: "HIGH" | "MEDIUM" | "LOW";
  label: string;
  count: number;
  color: string;
}

// Level -> colour for the card: the configured score colour (first set one per
// level), else the shared fallback, so it matches the other dashboard cards.
export function levelColors(scores: RiskScore[]): Record<string, string> {
  const colors: Record<string, string> = { ...LEVEL_FALLBACK_COLORS };
  const seen = new Set<string>();
  for (const score of scores) {
    if (score.color_code && !seen.has(score.risk_level)) {
      colors[score.risk_level] = score.color_code;
      seen.add(score.risk_level);
    }
  }
  return colors;
}

// A theme's non-empty High / Medium / Low segments, left to right.
export function themeSegments(theme: ManagedServicesTheme, colors: Record<string, string>): ThemeSegment[] {
  const all: ThemeSegment[] = [
    { level: "HIGH", label: "High", count: theme.high, color: colors.HIGH },
    { level: "MEDIUM", label: "Medium", count: theme.medium, color: colors.MEDIUM },
    { level: "LOW", label: "Low", count: theme.low, color: colors.LOW },
  ];
  return all.filter((s) => s.count > 0);
}

// The largest theme total, the bar scale's 100%; at least 1 so an empty list
// never divides by zero.
export function maxThemeTotal(themes: ManagedServicesTheme[]): number {
  return Math.max(1, ...themes.map((t) => t.total));
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

// "Risk themes across 15 customers · 57 total open risks · No closed risks"
export function managedSubtitle(data: ManagedServicesRisks): string {
  const closed = data.closed_risks === 0 ? "No closed risks" : plural(data.closed_risks, "closed risk", "closed risks");
  return [
    `Risk themes across ${plural(data.customer_count, "customer", "customers")}`,
    `${data.open_risks} total open ${data.open_risks === 1 ? "risk" : "risks"}`,
    closed,
  ].join(" · ");
}

// The callout under the table; null when there is no High risk to call out.
export function highSeverityCallout(data: ManagedServicesRisks): string | null {
  if (data.high_open + data.high_closed === 0) return null;
  const noun = data.high_open === 1 ? "High severity risk" : "High severity risks";
  if (data.high_closed === 0) return `${data.high_open} ${noun} — none closed`;
  return `${data.high_open} ${noun} open — ${data.high_closed} closed`;
}
