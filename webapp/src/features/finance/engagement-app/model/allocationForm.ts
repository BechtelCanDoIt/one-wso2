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

// The Add New Allocation popup's checks (AddNewAllocationPopup.js), in the legacy order and with the legacy messages.

import { addDays } from "./format";

export interface AllocationFormState {
  start: string;
  end: string;
  hourly: boolean;
  timeZone: string;
  from: string;
  to: string;
  status: string;
  travel: "" | "Yes" | "No";
  comment: string;
  tentative: boolean;
  preparation: boolean;
  preparationStart: string;
  postEngagement: boolean;
  postEngagementEnd: string;
}

/** The legacy default end: the engagement's end for two weeks or less, else twelve days in. */
export function defaultEnd(engStart: string, engEnd: string): string {
  const days = Math.round((Date.parse(`${engEnd}T00:00:00Z`) - Date.parse(`${engStart}T00:00:00Z`)) / 86_400_000) + 1;
  return days <= 14 ? engEnd : addDays(engStart, 11);
}

export function validateAllocation(
  f: AllocationFormState,
  ctx: { engStart: string; engEnd: string; needsStatus: boolean },
): string | null {
  if (!f.start || !f.end || !f.travel || (ctx.needsStatus && !f.status)) return "Some fields need attention.";
  if (f.hourly && (!f.from || !f.to || !f.timeZone)) return "Some fields need attention.";
  if (f.start < ctx.engStart || f.start > ctx.engEnd || f.end < ctx.engStart || f.end > ctx.engEnd) return "Start Date / End Date is not within the range";
  if (f.end < f.start) return "End Date should be higher than Start Date";
  if (f.hourly && f.to <= f.from) return "End Time should be higher than Start Time";
  if (f.preparation && f.preparationStart >= f.start) return "Pre-Prep Start Date must be less than the allocation Start Date";
  if (f.postEngagement && f.postEngagementEnd <= f.end) return "Post-Prep End Date must be greater than the allocation End Date";
  if (f.preparation && f.preparationStart < addDays(ctx.engStart, -14)) return "Pre-Prep Start Date is not within the range";
  if (f.postEngagement && f.postEngagementEnd > addDays(ctx.engEnd, 14)) return "Post-Prep End Date is not within the range";
  return null;
}

/** Team (default) allocations: required fields, and no dates more than 30 days back. */
export function validateTeamAllocation(
  f: { allocationType: string; code: string; start: string; end: string },
  today: string,
  editing: boolean,
): string | null {
  if (!f.allocationType || !f.code.trim() || !f.start || !f.end) return "Some fields need attention.";
  const floor = addDays(today, -30);
  if (!editing && (f.start < floor || f.end < floor)) return "Dates cannot be less than  30 days from today";
  if (f.end < f.start) return "End Date should be higher than Start Date";
  return null;
}
