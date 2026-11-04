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

// The Deal Desk board's settings (D130): its filters, and each column's
// sorts and quick filter, as agreed in the prototype.

import { roleLabel } from "@features/sales/cado2/approvals/model/approvalText";
import type { DeskColumnKey } from "../api/deskTypes";

/** The filters on top: they narrow every column. */
export interface DeskFilters {
  readonly q: string;
  readonly region: string;
  readonly dealType: string;
  readonly size: string;
  readonly minValue: string;
  readonly maxValue: string;
  readonly am: string;
  readonly productUnit: string;
  readonly channel: string;
  readonly submitted: string;
  readonly primaryOnly: string;
  readonly currency: string;
}

export const NO_FILTERS: DeskFilters = {
  q: "", region: "", dealType: "", size: "", minValue: "", maxValue: "", am: "", productUnit: "", channel: "", submitted: "", primaryOnly: "", currency: "",
};

export const DEAL_TYPES = [
  { value: "", label: "Any deal type" },
  { value: "FIRST_SALE", label: "First Sale" },
  { value: "RENEWAL", label: "Renewal" },
  { value: "EXPANSION", label: "Expansion" },
];

export const SIZES = [
  { value: "", label: "Any value" },
  { value: "0-50000", label: "Under $50K" },
  { value: "50000-250000", label: "$50K – $250K" },
  { value: "250000-1000000", label: "$250K – $1M" },
  { value: "1000000-", label: "Over $1M" },
  { value: "custom", label: "Custom range…" },
];

export const SUBMITTED = [
  { value: "", label: "Any time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const label = (options: readonly { value: string; label: string }[], value: string) => options.find((o) => o.value === value)?.label ?? value;

/** The filters as the backend's query, without the column's own part. */
export function filterQuery(f: DeskFilters): URLSearchParams {
  const p = new URLSearchParams();
  const set = (k: string, v: string) => {
    if (v.trim()) p.set(k, v.trim());
  };
  set("q", f.q);
  set("region", f.region);
  set("dealType", f.dealType);
  set("am", f.am);
  set("productUnit", f.productUnit);
  set("channel", f.channel);
  set("currency", f.currency.toUpperCase());
  set("submittedWithinDays", f.submitted);
  if (f.primaryOnly) p.set("primaryOnly", "true");
  const [min, max] = f.size === "custom" ? [f.minValue, f.maxValue] : f.size.split("-");
  set("valueMin", min ?? "");
  set("valueMax", max ?? "");
  return p;
}

/** "Filtered by" in words, e.g. ["“acme”", "NA", "Renewal"]. */
export function appliedFilters(f: DeskFilters): string[] {
  const out: string[] = [];
  if (f.q.trim()) out.push(`“${f.q.trim()}”`);
  if (f.region) out.push(f.region);
  if (f.dealType) out.push(label(DEAL_TYPES, f.dealType));
  if (f.size === "custom") out.push(`USD ${f.minValue || "0"} – ${f.maxValue || "any"}`);
  else if (f.size) out.push(label(SIZES, f.size));
  if (f.am.trim()) out.push(`AM ${f.am.trim()}`);
  if (f.productUnit.trim()) out.push(`Product unit ${f.productUnit.trim()}`);
  if (f.channel) out.push(f.channel === "PARTNER" ? "Partner" : "Direct");
  if (f.submitted) out.push(`Submitted ${label(SUBMITTED, f.submitted).toLowerCase()}`);
  if (f.primaryOnly) out.push("Primary only");
  if (f.currency.trim()) out.push(f.currency.trim().toUpperCase());
  return out;
}

/** How many of the "More filters" are set. */
export const moreCount = (f: DeskFilters) =>
  [f.am.trim(), f.productUnit.trim(), f.channel, f.submitted, f.primaryOnly, f.currency.trim()].filter(Boolean).length;

const WAITING_ROLES = ["REGIONAL_DIRECTOR", "AREA_GM", "LEGAL", "FIELD_ENGINEERING", "SUPPORT", "ENGINEERING", "CRO", "CHIEF_OF_STAFF", "CFO", "CEO"];

/** A column: its title, what's in it, its sorts and its one quick filter. */
export interface ColumnSpec {
  readonly key: DeskColumnKey;
  readonly title: string;
  readonly desc: string;
  readonly sorts: readonly { value: string; label: string }[];
  readonly quickLabel: string;
  readonly quick: readonly { value: string; label: string }[];
}

export const COLUMNS: readonly ColumnSpec[] = [
  {
    key: "review",
    title: "Your review",
    desc: "Deal Desk's approval is pending.",
    sorts: [{ value: "due", label: "Due soonest" }, { value: "value", label: "Highest value" }, { value: "old", label: "Oldest submitted" }],
    quickLabel: "Show",
    quick: [
      { value: "", label: "All" },
      { value: "overdue", label: "Overdue" },
      { value: "soon", label: "Due within 8 h" },
      { value: "resubmitted", label: "Resubmitted" },
      { value: "byYou", label: "Submitted by you" },
    ],
  },
  {
    key: "others",
    title: "With other approvers",
    desc: "Deal Desk approved; others still have to.",
    sorts: [{ value: "due", label: "Most overdue" }, { value: "value", label: "Highest value" }, { value: "old", label: "Oldest submitted" }],
    quickLabel: "Waiting on",
    quick: [{ value: "", label: "Anyone" }, { value: "overdue", label: "Overdue only" }, ...WAITING_ROLES.map((r) => ({ value: r, label: roleLabel(r) }))],
  },
  {
    key: "back",
    title: "Back with the AM",
    desc: "Returned or recalled. Revise it as Deal Desk if the AM is away.",
    sorts: [{ value: "idle", label: "Longest untouched" }, { value: "value", label: "Highest value" }, { value: "new", label: "Newest" }],
    quickLabel: "Show",
    quick: [{ value: "", label: "All" }, { value: "RETURNED", label: "Returned" }, { value: "RECALLED", label: "Recalled" }, { value: "idle7", label: "Untouched 7+ days" }],
  },
  {
    key: "approved",
    title: "Approved, not issued",
    desc: "The order form isn't with the customer yet.",
    sorts: [{ value: "waiting", label: "Longest waiting" }, { value: "value", label: "Highest value" }, { value: "new", label: "Newest" }],
    quickLabel: "Approved",
    quick: [{ value: "", label: "Any time" }, { value: "approved7", label: "7+ days ago" }, { value: "approved30", label: "30+ days ago" }],
  },
];

const HOUR = 3_600_000;

/** Whole days since a moment, at least 0. */
export const daysSince = (iso: string | null, now = Date.now()) => (iso ? Math.max(0, Math.floor((now - Date.parse(iso)) / (24 * HOUR))) : 0);

/** A deadline in words and tone: "Overdue 6 h" (late), "Due in 5 h" (soon), "Due in 2 d". */
export function dueText(iso: string, now = Date.now()): { text: string; tone: "late" | "soon" | "fine" } {
  const h = Math.round((Date.parse(iso) - now) / HOUR);
  const span = (x: number) => (x < 24 ? `${x} h` : `${Math.round(x / 24)} d`);
  if (h < 0) return { text: `Overdue ${span(-h)}`, tone: "late" };
  return { text: `Due in ${span(h)}`, tone: h < 8 ? "soon" : "fine" };
}
