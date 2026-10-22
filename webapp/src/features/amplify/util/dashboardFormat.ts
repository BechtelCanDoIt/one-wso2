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

import type { DashboardAnnouncement, ScorecardMeasure } from "../api/amplifyTypes";

/** A whole number with thousands separators. */
export function num(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("en-US");
}

/** A 0..1 rate as a whole percent, e.g. 0.667 -> "67%". */
export function rate(r: number | null | undefined): string {
  return `${Math.round((r ?? 0) * 100)}%`;
}

/** part / whole as a whole percent, "-" when there is no whole. */
export function percentOf(part: number, whole: number | null | undefined): string {
  if (!whole) return "-";
  return `${Math.round((part / whole) * 100)}%`;
}

/** This period against the one before: "+23 vs previous", "same as previous", "-4 vs previous". */
export function deltaText(now: number, before: number, noun = "previous period"): string {
  const d = now - before;
  if (d === 0) return `same as ${noun}`;
  return `${d > 0 ? "+" : "-"}${num(Math.abs(d))} vs ${noun}`;
}

/** Percent change between two counts, "-" when there is nothing to compare with. */
export function changePercent(now: number, before: number): string {
  if (before <= 0) return "-";
  const c = Math.round(((now - before) / before) * 100);
  return `${c >= 0 ? "+" : "-"}${Math.abs(c)}%`;
}

/** An ISO timestamp as "Oct 21". */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** "Oct 20 - Nov 19" for a post's window. */
export function windowText(opensAt: string, closesAt: string): string {
  return `${shortDate(opensAt)} – ${shortDate(closesAt)}`;
}

/** The Chat card's state in words. Queued means the outbox is still retrying it. */
export function announcementLabel(a: DashboardAnnouncement | undefined): string {
  if (!a || a.status === "NONE") return "Not announced";
  if (a.status === "SENT") return "Sent";
  if (a.status === "FAILED") return "Failed after retries";
  return a.attempts && a.attempts > 0 ? `Retrying · attempt ${a.attempts}` : "Queued";
}

/** A scorecard value with its unit, e.g. "18%" or "187". */
export function measureValue(m: Pick<ScorecardMeasure, "unit" | "value">): string {
  const v = Math.round(m.value * 10) / 10;
  return m.unit === "PERCENT" ? `${v}%` : num(v);
}

/** The target in words: "at least 25%" or "at most 5%". */
export function targetText(m: ScorecardMeasure): string {
  const v = Math.round(m.target * 10) / 10;
  const t = m.unit === "PERCENT" ? `${v}%` : num(v);
  return `${m.comparison === "AT_MOST" ? "At most" : "At least"} ${t}`;
}

/** The "42 / 150" detail under a scorecard value, when the API gave both numbers. */
export function fraction(m: ScorecardMeasure): string | null {
  if (m.numerator == null || m.denominator == null) return null;
  return `${num(m.numerator)} / ${num(m.denominator)}`;
}

/** The "as of" line under a board's title. */
export function asOfText(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `Updated ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}
