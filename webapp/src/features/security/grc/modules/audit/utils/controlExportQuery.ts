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
 * The audit detail page's current view as the query the controls export takes.
 *
 * Mirrors how the page filters: a tab takes precedence and the search and column
 * filters are ignored, otherwise the search and the column filters apply. The
 * server applies them with the same rules (and the same AND-across, OR-within
 * semantics), so the file holds exactly the rows the page shows.
 *
 * Multi-value filters are repeated params, not a comma-separated list: team and
 * person names can contain commas.
 */
export function buildControlExportQuery(
  tab: string | null,
  filters: Record<string, string[]>,
  search: string,
): URLSearchParams {
  const q = new URLSearchParams();
  if (tab) {
    q.set("tab", tab);
    return q;
  }
  const text = search.trim();
  if (text) q.set("search", text);
  // Column filter id -> export query param.
  const columns: [string, string][] = [
    ["status", "status"],
    ["requirementType", "requirement_type"],
    ["controlType", "control_type"],
    ["scope", "scope"],
    ["teamName", "team"],
    ["auditorName", "auditor"],
    ["ownerName", "owner"],
  ];
  for (const [field, param] of columns) {
    for (const value of filters[field] ?? []) q.append(param, value);
  }
  return q;
}
