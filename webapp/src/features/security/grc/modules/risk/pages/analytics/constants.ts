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

// Analytics-page-specific constants. Shared palette/label helpers (treatment,
// level, cert colors) live in ../dashboard/constants and are reused here so
// both pages read as one visual system.

import type { MonthRegisterCount, TrendPoint } from "../../api/riskApi";
import { parseDateStr } from "../risk-registers/utils";

// Fixed pipeline order for the workflow status funnel; exception statuses
// (revision/amendment/escalation) trail the main flow. Statuses absent from
// the response are skipped, not zero-filled — an empty stage isn't a stage.
export const WORKFLOW_FUNNEL_ORDER = [
  "PENDING_RISK_OWNER_APPROVAL",
  "PENDING_MANAGEMENT_APPROVAL",
  "PENDING_COMPLIANCE_REVIEW",
  "IN_REMEDIATION",
  "PENDING_OWNER_COMPLETION_APPROVAL",
  "PENDING_COMPLIANCE_CLOSURE",
  "CLOSED",
  "PENDING_AMENDMENT",
  "PENDING_REVISION",
  "ESCALATED",
] as const;

export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  PENDING_RISK_OWNER_APPROVAL: "Pending Owner Approval",
  PENDING_MANAGEMENT_APPROVAL: "Pending Management Approval",
  PENDING_COMPLIANCE_REVIEW: "Pending Compliance Approval",
  IN_REMEDIATION: "In Remediation",
  PENDING_OWNER_COMPLETION_APPROVAL: "Awaiting Owner Sign-off",
  PENDING_COMPLIANCE_CLOSURE: "Awaiting Closure",
  PENDING_AMENDMENT: "Pending Amendment",
  PENDING_REVISION: "Pending Revision",
  ESCALATED: "Escalated",
  CLOSED: "Closed",
};

export const WORKFLOW_STAGE_COLOR = "#2a78d6";

// Trend chart series colors. Bars share the treatment-strategy blue/green
// pairing used elsewhere; the score line gets its own accent so it reads
// distinctly against the bars.
export const IDENTIFIED_COLOR = "#2a78d6";
export const CLOSED_TREND_COLOR = "#1baf7a";
export const AVG_SCORE_COLOR = "#eb6834";

export interface QuarterlyAvgScore {
  quarter: string;
  avg_score: number | null;
}

// Rebuckets TrendChart's monthly avg_score into calendar quarters, averaging
// whichever months in a quarter had a non-null score. A quarter where every
// month is null (no risks identified at all) reports null rather than being
// zero-filled, matching TrendPoint's own "nil means no data" convention.
export function groupTrendByQuarter(data: TrendPoint[]): QuarterlyAvgScore[] {
  const buckets = new Map<string, { sum: number; count: number }>();
  const order: string[] = [];
  for (const d of data) {
    const date = parseDateStr(d.month);
    const quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
    if (!buckets.has(quarter)) {
      buckets.set(quarter, { sum: 0, count: 0 });
      order.push(quarter);
    }
    if (d.avg_score != null) {
      const bucket = buckets.get(quarter)!;
      bucket.sum += d.avg_score;
      bucket.count += 1;
    }
  }
  return order.map((quarter) => {
    const bucket = buckets.get(quarter)!;
    return { quarter, avg_score: bucket.count > 0 ? bucket.sum / bucket.count : null };
  });
}

// A quarter's row: "quarter" plus one numeric field per register present in
// that quarter (keyed by register name, read dynamically by the chart's
// per-register `bars` config — see AvgRisksByRegisterChart).
export type QuarterlyRegisterCount = { quarter: string } & Record<string, number | string>;

function quarterSortKey(quarter: string): number {
  const [q, year] = quarter.split(" ");
  return Number(year) * 10 + Number(q.slice(1));
}

// Rebuckets RegisterTrendChart's per-month-per-register counts into calendar
// quarters, averaging the up-to-3 months that fall in each quarter per
// register — so registers stay comparable against each other across time
// instead of collapsing to one all-time figure per register.
export function groupRegisterTrendByQuarter(
  data: MonthRegisterCount[],
): { rows: QuarterlyRegisterCount[]; registers: string[] } {
  const buckets = new Map<string, Map<string, { sum: number; count: number }>>();
  const registers = new Set<string>();
  for (const d of data) {
    const date = parseDateStr(d.month);
    const quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
    if (!buckets.has(quarter)) buckets.set(quarter, new Map());
    const byRegister = buckets.get(quarter)!;
    if (!byRegister.has(d.register_name)) byRegister.set(d.register_name, { sum: 0, count: 0 });
    const bucket = byRegister.get(d.register_name)!;
    bucket.sum += d.count;
    bucket.count += 1;
    registers.add(d.register_name);
  }

  const rows = [...buckets.entries()]
    .sort(([a], [b]) => quarterSortKey(a) - quarterSortKey(b))
    .map(([quarter, byRegister]) => {
      const row: QuarterlyRegisterCount = { quarter };
      for (const [register, { sum, count }] of byRegister) {
        row[register] = count > 0 ? sum / count : 0;
      }
      return row;
    });

  return { rows, registers: [...registers].sort((a, b) => a.localeCompare(b)) };
}
