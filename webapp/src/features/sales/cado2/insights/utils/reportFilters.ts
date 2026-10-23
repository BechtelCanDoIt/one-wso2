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

import { roleLabel } from "@features/sales/cado2/approvals/model/approvalText";
import { formatDate } from "@features/sales/cado2/quotes/form/draftForm";
import type {
  ReportRow,
  ReportDateField,
  ReportDealKind,
  ReportFilters,
  ReportPeriod,
  ReportSize,
  ReportSort,
  ReportStatus,
} from "../api/insightsTypes";

export const REPORT_STATUSES: readonly { readonly value: ReportStatus; readonly label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "In approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "RETURNED", label: "Returned" },
  { value: "RECALLED", label: "Recalled" },
  { value: "CLOSED", label: "Closed" },
];

export const PERIODS: readonly { readonly value: ReportPeriod; readonly label: string }[] = [
  { value: "", label: "Any time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range…" },
];

export const DEAL_KINDS: readonly { readonly value: ReportDealKind; readonly label: string }[] = [
  { value: "", label: "Any" },
  { value: "FIRST_SALE", label: "First Sale" },
  { value: "RENEWAL", label: "Renewal" },
  { value: "EXPANSION", label: "Expansion" },
];

export const SIZES: readonly { readonly value: ReportSize; readonly label: string }[] = [
  { value: "", label: "Any size" },
  { value: "0-50000", label: "Under $50K" },
  { value: "50000-250000", label: "$50K – $250K" },
  { value: "250000-1000000", label: "$250K – $1M" },
  { value: "1000000-", label: "Over $1M" },
  { value: "custom", label: "Custom range…" },
];

export const DATE_FIELDS: readonly { readonly value: ReportDateField; readonly label: string }[] = [
  { value: "CREATED", label: "Created" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
];

export const REPORT_SORTS: readonly ReportSort[] = ["CREATED", "SUBMITTED", "APPROVED", "VALUE", "ACCOUNT", "DAYS_IN_APPROVAL"];

export const DEFAULT_FILTERS: ReportFilters = {
  q: "",
  status: "",
  region: "",
  period: "",
  from: "",
  to: "",
  dateField: "SUBMITTED",
  dealKind: "",
  channel: "",
  waitingOn: "",
  size: "",
  minValue: "",
  maxValue: "",
  sort: "CREATED",
  order: "desc",
  page: 1,
};

const oneOf = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const values = <T extends string>(xs: readonly { value: T }[]) => xs.map((x) => x.value);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The filters in a URL; anything unknown falls back to its default. */
export function filtersFromSearch(params: URLSearchParams): ReportFilters {
  const page = Number(params.get("page"));
  const date = (k: string) => (ISO_DATE.test(params.get(k) ?? "") ? (params.get(k) as string) : "");
  return {
    q: params.get("q") ?? "",
    status: oneOf(params.get("status"), ["", ...values(REPORT_STATUSES)], ""),
    region: params.get("region") ?? "",
    period: oneOf(params.get("period"), values(PERIODS), ""),
    from: date("from"),
    to: date("to"),
    dateField: oneOf(params.get("dateField"), values(DATE_FIELDS), "SUBMITTED"),
    dealKind: oneOf(params.get("dealKind"), values(DEAL_KINDS), ""),
    channel: oneOf(params.get("channel"), ["", "DIRECT", "PARTNER"] as const, ""),
    waitingOn: params.get("waitingOn") ?? "",
    size: oneOf(params.get("size"), values(SIZES), ""),
    minValue: params.get("minValue") ?? "",
    maxValue: params.get("maxValue") ?? "",
    sort: oneOf(params.get("sort"), REPORT_SORTS, "CREATED"),
    order: oneOf(params.get("order"), ["asc", "desc"] as const, "desc"),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** The filters as a URL query: only what differs from the defaults. */
export function filtersToSearch(f: ReportFilters): URLSearchParams {
  const out = new URLSearchParams();
  (Object.keys(DEFAULT_FILTERS) as (keyof ReportFilters)[]).forEach((k) => {
    const v = typeof f[k] === "string" ? (f[k] as string).trim() : f[k];
    if (v !== DEFAULT_FILTERS[k] && v !== "") out.set(k, String(v));
  });
  // A custom range's dates and amounts mean nothing without "custom".
  if (f.period !== "custom") ["from", "to"].forEach((k) => out.delete(k));
  if (f.size !== "custom") ["minValue", "maxValue"].forEach((k) => out.delete(k));
  return out;
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The dates a period covers (YYYY-MM-DD, both inclusive); empty = open. */
export function periodRange(f: ReportFilters, today: Date = new Date()): { from: string; to: string } {
  switch (f.period) {
    case "30":
    case "90": {
      const d = new Date(today);
      d.setDate(d.getDate() - Number(f.period));
      return { from: iso(d), to: "" };
    }
    case "quarter":
      return { from: iso(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)), to: "" };
    case "year":
      return { from: iso(new Date(today.getFullYear(), 0, 1)), to: "" };
    case "custom":
      return { from: f.from, to: f.to };
    default:
      return { from: "", to: "" };
  }
}

/** The USD range a deal size covers; null bounds are open. */
export function sizeRange(f: ReportFilters): { min: string; max: string } {
  if (f.size === "custom") return { min: f.minValue.trim(), max: f.maxValue.trim() };
  if (!f.size) return { min: "", max: "" };
  const [min, max] = f.size.split("-");
  return { min, max: max ?? "" };
}

/** The API query for a page of the report. */
export function reportQuery(f: ReportFilters, page: number, pageSize: number, today: Date = new Date()): string {
  const p = new URLSearchParams();
  const put = (k: string, v: string) => {
    if (v) p.set(k, v);
  };
  put("q", f.q.trim());
  put("statuses", f.status);
  put("regions", f.region);
  const { from, to } = periodRange(f, today);
  if (from || to) {
    p.set("dateField", f.dateField);
    put("from", from);
    put("to", to);
  }
  put("dealKinds", f.dealKind);
  put("channel", f.channel);
  put("waitingOn", f.waitingOn);
  const { min, max } = sizeRange(f);
  put("minValue", min);
  // The bands' upper bounds are exclusive in words ("$50K – $250K"); the API's are inclusive, so a cent less.
  put("maxValue", max && f.size !== "custom" ? String(Number(max) - 0.01) : max);
  p.set("sort", f.sort);
  p.set("order", f.order);
  p.set("page", String(page));
  p.set("pageSize", String(pageSize));
  return p.toString();
}

/** How many filters are set inside "More filters", for its badge. */
export function moreFilterCount(f: ReportFilters): number {
  const { min, max } = sizeRange(f);
  return [f.dealKind, f.channel, f.waitingOn, min || max].filter(Boolean).length;
}

const label = <T extends string>(xs: readonly { value: T; label: string }[], v: T) => xs.find((x) => x.value === v)?.label ?? v;
const money = (v: string) => `$${Number(v).toLocaleString("en-US")}`;

/** What's applied, in words: "In approval · NA · Submitted 1 Aug – 30 Sept 2026 · Renewal". */
export function appliedFilters(f: ReportFilters): string[] {
  const out: string[] = [];
  if (f.q.trim()) out.push(`“${f.q.trim()}”`);
  if (f.status) out.push(label(REPORT_STATUSES, f.status));
  if (f.region) out.push(f.region);
  const field = label(DATE_FIELDS, f.dateField);
  if (f.period === "custom") {
    if (f.from || f.to) out.push(`${field} ${f.from ? formatDate(f.from) : "any time"} – ${f.to ? formatDate(f.to) : "today"}`);
  } else if (f.period) {
    out.push(`${field}: ${label(PERIODS, f.period)}`);
  }
  if (f.dealKind) out.push(label(DEAL_KINDS, f.dealKind));
  if (f.channel) out.push(f.channel === "PARTNER" ? "Partner" : "Direct");
  if (f.waitingOn) out.push(`Waiting on ${roleLabel(f.waitingOn)}`);
  const { min, max } = sizeRange(f);
  if (f.size === "custom" && (min || max)) out.push(`${min ? money(min) : "$0"} – ${max ? money(max) : "any"}`);
  else if (f.size && f.size !== "custom") out.push(label(SIZES, f.size));
  return out;
}

/** First Sale, Renewal, Expansion, or the record type's own name (D35). */
export function dealLabel(r: Pick<ReportRow, "dealKind" | "recordTypeName">): string {
  const kinds = { FIRST_SALE: "First Sale", RENEWAL: "Renewal", EXPANSION: "Expansion" } as const;
  return r.dealKind === "OTHER" ? (r.recordTypeName ?? "—") : kinds[r.dealKind];
}
