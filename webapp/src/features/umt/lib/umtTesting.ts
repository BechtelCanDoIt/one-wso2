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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import type { UmtLifecycleState } from "../api/umtTypes";
import type { UmtStagingTestResultRecord } from "../api/umtUpdates";

export const UMT_TESTING_LIFECYCLE_STATES = [
  "TestingEnvironmentRequested",
  "TestingEnvironmentCreated",
  "TestingEnvironmentFailed",
  "StagingRequested",
  "Staging",
] as const satisfies readonly UmtLifecycleState[];

export type UmtTestingResultValue = "success" | "failure" | "not_built";

export const UMT_TESTING_RESULT_OPTIONS: { value: UmtTestingResultValue; label: string }[] = [
  { value: "success", label: "Successful" },
  { value: "failure", label: "Failed" },
  { value: "not_built", label: "Not Performed" },
];

// Failed/Not Performed require a comment; Successful doesn't.
export function umtTestingResultRequiresComment(value: string): boolean {
  return value === "failure" || value === "not_built";
}

// A single persisted row already has a valid result (and a comment if the
// result requires one) — the shell's Proceed-gate rule.
export function umtStagingRowIsComplete(record: UmtStagingTestResultRecord): boolean {
  const result = record.manualTestResult?.trim() ?? "";
  if (!result) return false;
  if (umtTestingResultRequiresComment(result)) return Boolean(record.manualTestComment?.trim());
  return true;
}

// What keeps the Testing step's Proceed closed once the update is in Staging,
// or null when nothing does. An unsuccessful automated run is reported ahead
// of an incomplete manual row, since the user can fix the latter but not the
// former. An admin may proceed past an automated run that has not succeeded.
export type UmtTestingBlocker = "no-results" | "automated-run" | "manual-result";

export function umtTestingBlocker(
  records: UmtStagingTestResultRecord[] | null | undefined,
  isAdmin = false,
): UmtTestingBlocker | null {
  const rows = records ?? [];
  if (rows.length === 0) return "no-results";
  if (!isAdmin && rows.some((row) => row.automatedTestResult !== "success")) return "automated-run";
  if (!rows.every(umtStagingRowIsComplete)) return "manual-result";
  return null;
}

// True when lifecycleState has reached Staging AND umtTestingBlocker finds
// nothing in the way: at least one record to review, every automated run
// successful (unless the caller is an admin), and every manual row complete.
// False for every other state.
export function isTestingComplete(
  lifecycleState: UmtLifecycleState | null | undefined,
  records: UmtStagingTestResultRecord[] | null | undefined,
  { isAdmin = false }: { isAdmin?: boolean } = {},
): boolean {
  if (lifecycleState !== "Staging") return false;
  return umtTestingBlocker(records, isAdmin) === null;
}

// Color for the Automated Test Result indicator: green while success, red
// on failure, blue while the Jenkins build is still running, grey
// otherwise/unknown. Returned as an MUI theme color path (ready for an sx
// `bgcolor`), not a bare palette key.
export function umtAutomatedTestResultColor(value: string | null | undefined): string {
  switch ((value ?? "").toLowerCase()) {
    case "success":
      return "success.main";
    case "failure":
      return "error.main";
    case "building":
      return "info.main";
    default:
      return "grey.400";
  }
}

// Renders the raw backend value in title case (e.g. "not_built" ->
// "Not Built"). Values here are already lower_snake_case from the backend.
export function umtAutomatedTestResultLabel(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "Unknown";
  return trimmed
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function isAutomatedTestResult(value: string | null | undefined, expected: string): boolean {
  return (value ?? "").trim().toLowerCase() === expected;
}

// An automated run can be started again unless it succeeded or is already
// running; a failed, unstable, pending or unreadable result can.
export function umtCanRetriggerAutomatedTest(value: string | null | undefined): boolean {
  return !isAutomatedTestResult(value, "success") && !isAutomatedTestResult(value, "building");
}

// How long a retrigger counts as pending after it was accepted: the results
// keep polling and the row withholds Retrigger, so the new run's state shows up
// without a second request even when the first refetch still has the previous
// result.
export const UMT_RETRIGGER_POLL_WINDOW_MS = 60_000;

// Whether a retrigger accepted at `retriggeredAt` (epoch ms) is still pending.
export function umtRetriggerIsPending(retriggeredAt: number | null | undefined, now: number): boolean {
  return retriggeredAt != null && now - retriggeredAt < UMT_RETRIGGER_POLL_WINDOW_MS;
}

// Whether a staging row offers Retrigger: the request names a product and its
// base version but no channel, so only a full-channel row with both can use
// it, and only while its automated result allows another run and no retrigger
// accepted at `retriggeredAt` is still pending.
export function umtCanRetriggerStagingRow(
  row: UmtStagingTestResultRecord,
  retriggeredAt?: number | null,
  now: number = Date.now(),
): boolean {
  return (
    (row.channel ?? "full") === "full" &&
    Boolean(row.productName && row.baseVersion) &&
    !umtRetriggerIsPending(retriggeredAt, now) &&
    umtCanRetriggerAutomatedTest(row.automatedTestResult)
  );
}

// Whether polling for staging test results should keep running: true while
// lifecycleState is one of the transient in-between states, false once it's
// reached a terminal state (Staging or Failed) — stops polling on failure
// too, not just success, so a permanently-failed environment isn't polled
// forever. At Staging it also continues while an automated run is building
// and for UMT_RETRIGGER_POLL_WINDOW_MS after a retrigger (`retriggeredAt`, an
// epoch time in ms), so a retriggered run's outcome shows up without a reload.
export function umtShouldPollStagingTestResults(
  lifecycleState: UmtLifecycleState | null | undefined,
  records?: UmtStagingTestResultRecord[] | null,
  retriggeredAt?: number | null,
  now: number = Date.now(),
): boolean {
  if (lifecycleState === "Staging") {
    return (
      umtRetriggerIsPending(retriggeredAt, now) ||
      (records ?? []).some((record) => isAutomatedTestResult(record.automatedTestResult, "building"))
    );
  }
  return (
    lifecycleState === "TestingEnvironmentRequested" ||
    lifecycleState === "TestingEnvironmentCreated" ||
    lifecycleState === "StagingRequested"
  );
}
