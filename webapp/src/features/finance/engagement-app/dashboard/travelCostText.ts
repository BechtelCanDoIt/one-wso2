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

import type { CostSource, NotConverted } from "../api/engagementTypes";
import { money } from "../model/format";

/** The hint beside every Travel Cost heading, (the CSVs carry a short version in their header block). */
export const USD_RATE_HINT =
  "Amounts recorded in USD, and card charges billed in USD, are used as they are. Other currencies are converted at NetSuite's month-end rate (today's rate for the current month).";

/** The hint once the Transactions widget shows each line's rate. */
export const USD_RATE_HINT_WITH_TRANSACTIONS = `${USD_RATE_HINT} Each transaction shows how it was converted.`;

/** What a cost source is called on screen. */
export const COST_SOURCE_LABEL: Readonly<Record<CostSource, string>> = {
  invoice: "Travel Invoices",
  perDiem: "Per Diems",
  card: "Credit Card Expenses",
  claim: "Expense Claims",
};

/** Up to this many unconverted amounts are listed in full; more are summed up in one line with the list behind Show Details. */
export const NOT_CONVERTED_INLINE_MAX = 3;

/** Every unconverted amount with its source, e.g. "AED 5,940.00 (Per Diems), BRL 712.35 (Expense Claims)". */
export function notConvertedList(rows: readonly NotConverted[]): string {
  return rows.map((r) => `${r.currency ? money(r.amount, r.currency) : `Unknown currency ${money(r.amount, undefined)}`} (${COST_SOURCE_LABEL[r.source]})`).join(", ");
}

/** The one line under the KPIs for amounts that could not be converted, or an empty string when there are none. */
export function notConvertedText(rows: readonly NotConverted[]): string {
  if (!rows.length) return "";
  return `Not converted, left out of the totals: ${notConvertedList(rows)}`;
}

/** The short form for many amounts: how many, in how many currencies, and from which sources. */
export function notConvertedSummary(rows: readonly NotConverted[]): string {
  const recorded = new Set(rows.map((r) => r.currency).filter(Boolean)).size;
  const unknown = rows.some((r) => !r.currency);
  const parts = [...(recorded ? [`${recorded} ${recorded === 1 ? "currency" : "currencies"}`] : []), ...(unknown ? ["unknown currency"] : [])];
  const sources = [...new Set(rows.map((r) => COST_SOURCE_LABEL[r.source]))];
  return `Not converted, left out of the totals: ${rows.length} amounts in ${parts.join(" and ")} (${sources.join(", ")}).`;
}
