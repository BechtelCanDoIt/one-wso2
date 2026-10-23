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

import { useTheme } from "@wso2/oxygen-ui";

/**
 * Insights' own colours (the approved v2 design, 2026-10-22): calm status
 * colours used the same way on every chart, with a dark-mode set. Kept here,
 * in one place, so the page stays consistent.
 */
export interface InsightsPalette {
  readonly ok: string;
  readonly soon: string;
  readonly late: string;
  /** A paler green for the second age group ("1–3 days"). */
  readonly okPale: string;
  readonly okTint: string;
  readonly soonTint: string;
  readonly soonText: string;
  readonly lateTint: string;
  readonly lateText: string;
  /** The empty part of a bar. */
  readonly track: string;
  readonly line: string;
  readonly ink: string;
}

const LIGHT: InsightsPalette = {
  ok: "#2f9e6e",
  soon: "#d08a1e",
  late: "#c94a4a",
  okPale: "#8fb8a4",
  okTint: "#e8f4ee",
  soonTint: "#fbf1e1",
  soonText: "#9a6212",
  lateTint: "#f8e7e7",
  lateText: "#b03c3c",
  track: "#eef1f5",
  line: "#e5e8ee",
  ink: "#1e293b",
};

const DARK: InsightsPalette = {
  ok: "#45b385",
  soon: "#e0a040",
  late: "#e06666",
  okPale: "#5f8f7a",
  okTint: "rgba(69, 179, 133, 0.16)",
  soonTint: "rgba(224, 160, 64, 0.16)",
  soonText: "#f0c27a",
  lateTint: "rgba(224, 102, 102, 0.16)",
  lateText: "#f09a9a",
  track: "rgba(255, 255, 255, 0.08)",
  line: "rgba(255, 255, 255, 0.12)",
  ink: "#e2e8f0",
};

export function useInsightsPalette(): InsightsPalette {
  return useTheme().palette.mode === "dark" ? DARK : LIGHT;
}
