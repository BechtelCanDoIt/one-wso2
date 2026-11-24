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

import { addDays, yearStart } from "../../model/format";

export type RangePreset = "ytd" | "l12m" | "qtd" | "lastq" | "mtd" | "lastm" | "year" | "custom";

export const RANGE_PRESETS: readonly { readonly value: RangePreset; readonly label: string }[] = [
  { value: "ytd", label: "Year to Date" },
  { value: "l12m", label: "Last 12 Months" },
  { value: "qtd", label: "This Quarter" },
  { value: "lastq", label: "Last Quarter" },
  { value: "mtd", label: "This Month" },
  { value: "lastm", label: "Last Month" },
  { value: "year", label: "Calendar Year" },
  { value: "custom", label: "Custom" },
];

export interface DateRange {
  readonly from: string;
  readonly to: string;
}

const pad = (n: number): string => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number): string => `${y}-${pad(m)}-${pad(d)}`;
const parts = (day: string): { y: number; m: number; d: number } => {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d };
};
/** The last day of a month (month is 1 to 12). */
const lastDay = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** The same day one year on or earlier: 29 February becomes 28 February. */
export function shiftYears(day: string, years: number): string {
  const { y, m, d } = parts(day);
  return iso(y + years, m, Math.min(d, lastDay(y + years, m)));
}

/** The range every preset means on `today` (yyyy-MM-dd). `custom` returns the given dates, or the year to date. */
export function rangeFor(preset: RangePreset, today: string, opts: { year?: number; from?: string; to?: string } = {}): DateRange {
  const { y, m } = parts(today);
  const quarterStartMonth = Math.floor((m - 1) / 3) * 3 + 1;
  switch (preset) {
    case "l12m":
      return { from: addDays(shiftYears(today, -1), 1), to: today };
    case "qtd":
      return { from: iso(y, quarterStartMonth, 1), to: today };
    case "lastq": {
      const lastQuarterStart = quarterStartMonth - 3;
      const [qy, qm] = lastQuarterStart < 1 ? [y - 1, lastQuarterStart + 12] : [y, lastQuarterStart];
      return { from: iso(qy, qm, 1), to: iso(qy, qm + 2, lastDay(qy, qm + 2)) };
    }
    case "mtd":
      return { from: iso(y, m, 1), to: today };
    case "lastm": {
      const [ly, lm] = m === 1 ? [y - 1, 12] : [y, m - 1];
      return { from: iso(ly, lm, 1), to: iso(ly, lm, lastDay(ly, lm)) };
    }
    case "year": {
      const cy = opts.year ?? y - 1;
      return { from: iso(cy, 1, 1), to: iso(cy, 12, 31) };
    }
    case "custom":
      return { from: opts.from || yearStart(today), to: opts.to || today };
    default:
      return { from: yearStart(today), to: today };
  }
}

/** The same period one year earlier, as the backend compares it. */
export const previousYear = (r: DateRange): DateRange => ({ from: shiftYears(r.from, -1), to: shiftYears(r.to, -1) });

/** The last five calendar years, newest first, for the Calendar Year select. */
export const recentYears = (today: string): readonly number[] => Array.from({ length: 5 }, (_, i) => parts(today).y - i);

/** At most 731 days, the backend's limit. */
export const MAX_RANGE_DAYS = 731;

/** Why a custom range cannot be asked for, or an empty string. */
export function rangeProblem(r: DateRange): string {
  if (!r.from || !r.to) return "Choose a start and an end date.";
  if (r.from > r.to) return "The start date is after the end date.";
  const days = (Date.parse(r.to) - Date.parse(r.from)) / 86_400_000 + 1;
  return days > MAX_RANGE_DAYS ? "Choose a range of two years or less." : "";
}
