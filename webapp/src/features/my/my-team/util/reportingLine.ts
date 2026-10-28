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
// How a team member is linked to the person viewing My Team.
//
// The server walks both manager links when it builds the chain: the manager and
// any additional managers. Someone who is there only because the viewer is one
// of their additional managers looks like a mistake unless the row says so.

import type { Employee } from "../../api/types";

const normalise = (email: string) => email.trim().toLowerCase();

/**
 * Whether the viewer is one of this member's additional managers, and not also
 * their manager.
 *
 * `additionalManagerEmails` is the server's comma-separated list of active
 * additional managers, `''` when there are none.
 */
export function isAdditionalReport(
  employee: Pick<Employee, "managerEmail" | "additionalManagerEmails">,
  viewerEmail: string | null | undefined,
): boolean {
  const viewer = normalise(viewerEmail ?? "");
  if (viewer === "" || normalise(employee.managerEmail ?? "") === viewer) return false;
  return (employee.additionalManagerEmails ?? "").split(",").some((email) => normalise(email) === viewer);
}

/** One of the viewer's additional reports. */
export interface AdditionalReport {
  employeeId: string;
  firstName: string;
  lastName: string;
}

/**
 * The viewer's additional report this member is in the team through, or null.
 *
 * The server names one only when every route to the member starts from it. The
 * viewer's own additional report is null here: that is the closer link, and it
 * has its own chip.
 */
export function cameThrough(
  employee: Pick<
    Employee,
    | "managerEmail"
    | "additionalManagerEmails"
    | "throughEmployeeId"
    | "throughFirstName"
    | "throughLastName"
  >,
  viewerEmail: string | null | undefined,
): AdditionalReport | null {
  if (!employee.throughEmployeeId || isAdditionalReport(employee, viewerEmail)) return null;
  return {
    employeeId: employee.throughEmployeeId,
    firstName: employee.throughFirstName ?? "",
    lastName: employee.throughLastName ?? "",
  };
}

/**
 * The chip's text: the first word of their first name, which keeps it short,
 * falling back to the last name. The full name is in the hover text.
 */
export function viaLabel(person: Pick<AdditionalReport, "firstName" | "lastName">): string {
  const first = person.firstName.trim().split(/\s+/)[0];
  return `Via ${first || person.lastName.trim()}`;
}
