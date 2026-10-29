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
import { serverMessage } from "@api/errors";
import { HttpError } from "@api/http";

// HTTP statuses that retrying can't fix: the record itself was refused.
const PERMANENT = new Set([400, 403, 413]);

/**
 * What to tell the user when an NDA couldn't be recorded (and so wasn't
 * downloaded). Only an outage is worth retrying; a refused record says why,
 * using the legal backend's own message, which is safe to show.
 */
export function recordFailureMessage(err: unknown): string {
  if (err instanceof HttpError && PERMANENT.has(err.status)) {
    const reason = serverMessage(err);
    return reason
      ? `Couldn't record the NDA, so it wasn't downloaded: ${reason}. Please contact the Legal team.`
      : "Couldn't record the NDA, so it wasn't downloaded. Please contact the Legal team.";
  }
  return "Couldn't record the NDA, so it wasn't downloaded. Please try again.";
}

/** Shown when the legal backend can't be reached to check whether to record. */
export const ACCESS_UNKNOWN_MESSAGE =
  "Couldn't reach the NDA service to record this NDA, so it wasn't downloaded. Please try again shortly.";
