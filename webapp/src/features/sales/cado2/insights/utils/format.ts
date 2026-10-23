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

/**
 * A headline amount, short: "USD 4.2M", "USD 830K", "USD 950". The exact
 * figure goes in a tooltip or the table.
 */
export function compactMoney(value: string | null | undefined, currency: string): string {
  if (value == null) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const short = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  return `${currency} ${short}`;
}

/** A duration in hours, readable: "45 min", "6.5 h", "1.8 days". */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours * 10) / 10} h`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** "3 days ago", "5 h ago": how long something has been waiting. */
export function waitingSince(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "—";
  const hours = (now.getTime() - new Date(iso).getTime()) / 3_600_000;
  return hours < 0 ? "—" : formatHours(hours);
}

/**
 * A headline amount split for display: { value: "$6.4", unit: "M" }. USD
 * shows as "$"; other currencies keep their code ("EUR 6.4", "M").
 */
export function splitCompactMoney(value: string | null | undefined, currency: string): { value: string; unit: string } {
  if (value == null || !Number.isFinite(Number(value))) return { value: "—", unit: "" };
  const parts = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).formatToParts(Number(value));
  const unit = parts.find((p) => p.type === "compact")?.value ?? "";
  const number = parts.filter((p) => p.type !== "compact").map((p) => p.value).join("");
  return { value: currency === "USD" ? `$${number}` : `${currency} ${number}`, unit };
}

/** A duration split for display: { value: "13.1", unit: "h" } or { "1.8", "days" }. */
export function splitHours(hours: number | null | undefined): { value: string; unit: string } {
  if (hours == null) return { value: "—", unit: "" };
  if (hours < 1) return { value: String(Math.round(hours * 60)), unit: "min" };
  if (hours < 48) return { value: String(Math.round(hours * 10) / 10), unit: "h" };
  const days = Math.round((hours / 24) * 10) / 10;
  return { value: String(days), unit: "days" };
}
