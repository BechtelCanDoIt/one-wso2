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
// Periods the NDA Records tab offers, cut to what the backend allows; the
// backend's default and maximum are always offered too.
const PERIOD_CHOICES = [1, 3, 7, 30];

/** "Last day", "Last 7 days". */
export function periodLabel(days: number): string {
  return days === 1 ? "Last day" : `Last ${days} days`;
}

/** The periods to offer: the usual ones up to maxDays, plus the default and the maximum. */
export function periodOptions(defaultDays: number | null, maxDays: number | null): number[] {
  if (defaultDays === null) return [];
  if (maxDays === null) return [defaultDays];
  const options = new Set([...PERIOD_CHOICES.filter((d) => d <= maxDays), defaultDays, maxDays]);
  return [...options].sort((a, b) => a - b);
}
