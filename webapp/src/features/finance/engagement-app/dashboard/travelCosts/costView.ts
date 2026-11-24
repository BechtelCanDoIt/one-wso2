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

import type { EngagementQueryParams } from "@config/apiConfig";
import { rangeFor, type DateRange, type RangePreset } from "./dateRanges";

// The Travel Costs controls bar's state, in the address bar. It owns only the keys that start with "tc".

export const FILTER_KEYS = ["tcSource", "tcEmployee", "tcJob", "tcCountry", "tcAgent", "tcPaid", "tcCustomer", "tcCostType", "tcUnlinked"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

/** The API parameter each filter key becomes. */
const PARAM: Readonly<Record<FilterKey, string>> = {
  tcSource: "source",
  tcEmployee: "employee",
  tcJob: "jobNumber",
  tcCountry: "country",
  tcAgent: "travelAgent",
  tcPaid: "paid",
  tcCustomer: "customer",
  tcCostType: "costType",
  tcUnlinked: "unlinked",
};

export const PAGE_SIZE = 25;
export const GROUPS = ["employee", "jobNumber", "country", "customer", "travelAgent", "source", "costType", "month"] as const;
export type GroupBy = (typeof GROUPS)[number];
export type CostSort = "date" | "-date" | "amount" | "-amount";
export type CostMode = "charts" | "tables";

const PRESETS: readonly RangePreset[] = ["ytd", "l12m", "qtd", "lastq", "mtd", "lastm", "year", "custom"];

export interface CostView {
  readonly range: RangePreset;
  readonly year?: number;
  readonly period: DateRange;
  readonly compare: boolean;
  readonly mode: CostMode;
  /** Filter values by their URL key. */
  readonly filters: Readonly<Partial<Record<FilterKey, readonly string[]>>>;
  readonly group?: GroupBy;
  readonly sort: CostSort;
  readonly page: number;
}

export type CostViewPatch = Readonly<Record<string, string | undefined>>;

const split = (v: string | undefined): string[] => (v ? v.split(",").filter(Boolean) : []);

/** The view the address bar describes. Unknown or malformed values read as the default. */
export function readCostView(raw: Readonly<Record<string, string>>, today: string): CostView {
  const range = (PRESETS as readonly string[]).includes(raw.tcRange) ? (raw.tcRange as RangePreset) : "ytd";
  const year = /^\d{4}$/.test(raw.tcYear ?? "") ? Number(raw.tcYear) : undefined;
  const validDay = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const filters: Partial<Record<FilterKey, string[]>> = {};
  for (const k of FILTER_KEYS) if (raw[k]) filters[k] = split(raw[k]);
  const sort = (["date", "-date", "amount", "-amount"] as const).find((s) => s === raw.tcSort) ?? "-date";
  return {
    range,
    year,
    period: rangeFor(range, today, { year, from: validDay(raw.tcFrom), to: validDay(raw.tcTo) }),
    compare: raw.tcCompare !== "0",
    mode: raw.tcView === "tables" ? "tables" : "charts",
    filters,
    group: GROUPS.find((g) => g === raw.tcGroup),
    sort,
    page: Math.max(0, Number(raw.tcPage ?? 0) || 0),
  };
}

/** `view` with the `patch` applied. An empty or undefined patch value removes the key; every key outside "tc" is kept. */
export function patchCostView(view: Readonly<Record<string, string>>, patch: CostViewPatch): Record<string, string> {
  const next: Record<string, string> = { ...view };
  // Any change other than the page itself sends the Transactions back to the first page.
  if (!("tcPage" in patch)) delete next.tcPage;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "") delete next[k];
    else next[k] = v;
  }
  return next;
}

/** Click on a bar or row: that filter takes this one value (replacing any), and the Transactions go back to the first page. */
export function drillPatch(key: FilterKey, value: string): CostViewPatch {
  return { [key]: value, tcPage: undefined };
}

/** The filter a chart's bar sends back, by the widget that draws it. */
export const DRILL_KEY = {
  source: "tcSource",
  country: "tcCountry",
  customer: "tcCustomer",
  travelAgent: "tcAgent",
  costType: "tcCostType",
  paid: "tcPaid",
} as const satisfies Record<string, FilterKey>;

/** The filter and range parameters every Travel Costs call takes. */
export function costParams(view: CostView): EngagementQueryParams {
  const out: Record<string, string | boolean | readonly string[] | undefined> = {
    from: view.period.from,
    to: view.period.to,
    compare: view.compare ? undefined : false,
  };
  for (const k of FILTER_KEYS) {
    const values = view.filters[k];
    if (!values?.length) continue;
    out[PARAM[k]] = k === "tcUnlinked" ? "true" : values;
  }
  return out;
}

/** The Transactions call: the same filters, plus Group By, Sort and the page. */
export function transactionParams(view: CostView): EngagementQueryParams {
  return { ...costParams(view), groupBy: view.group, sort: view.sort === "-date" ? undefined : view.sort, limit: PAGE_SIZE, offset: view.page * PAGE_SIZE };
}

/** How many filters are applied (for the Filters button's badge). */
export const filterCount = (view: CostView): number => FILTER_KEYS.filter((k) => view.filters[k]?.length).length;
