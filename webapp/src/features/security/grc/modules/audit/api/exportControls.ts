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


import { BACKEND_BASE_URL } from "@features/security/grc/shim/apiConfig";
import { extractErrorMessage } from "@features/security/grc/modules/audit/api/apiError";

type AuthFetch = (input: RequestInfo | URL, options?: RequestInit) => Promise<Response>;

/**
 * Downloads an audit's controls as CSV: every control the given view selects
 * (see buildControlExportQuery), not just the page of the table on screen.
 * Resolves with the file and the name the server gave it.
 */
export async function exportControls(
  authFetch: AuthFetch,
  auditId: number,
  query: URLSearchParams,
): Promise<{ blob: Blob; fileName: string }> {
  const res = await authFetch(`${BACKEND_BASE_URL}/api/v1/audits/${auditId}/controls/export?${query}`);
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, `Failed to export controls (${res.status})`));
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const fileName =
    /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1] ??
    `audit-controls-${new Date().toISOString().slice(0, 10)}.csv`;
  return { blob: await res.blob(), fileName };
}
