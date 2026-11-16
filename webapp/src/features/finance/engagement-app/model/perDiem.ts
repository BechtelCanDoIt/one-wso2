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

// The legacy per diem maths (PerdiemInformation.js), shown in the Add Per Diem dialog before saving.

import { daysBetween } from "./format";

/** No. of Days: the date difference plus one. */
export function perDiemDays(start: string, end: string): number {
  if (!start || !end) return 0;
  return daysBetween(start.slice(0, 10), end.slice(0, 10)) + 1;
}

/** Total Amount: the first day counts in full when it starts at 12:00 or earlier, else half; the last day in full when it ends at 12:00 or later, else half; every day between in full. */
export function perDiemTotal(start: string, end: string, rate: number): number {
  if (!start || !end || !(rate > 0) || end <= start) return 0;
  const days = perDiemDays(start, end);
  const first = start.slice(11, 16) <= "12:00" ? 1 : 0.5;
  const last = end.slice(11, 16) >= "12:00" ? 1 : 0.5;
  return Math.round((first + last + (days - 2)) * rate * 100) / 100;
}
