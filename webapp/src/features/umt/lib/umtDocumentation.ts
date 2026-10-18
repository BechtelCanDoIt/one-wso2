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

/** UMT's Documentation rail row, which opens the backend-configured docs link. */
export const UMT_DOCUMENTATION_ITEM_ID = "umt-documentation";

// The last documentation link useUmtDocumentationUrl fetched. Module-level so
// the rail row's action, which lives in the static perspective registry, can
// read it at click time. The fetch happens before the row is shown, so the tab
// opens straight from the click rather than after an await, which browsers
// block as an unsolicited popup.
let documentationUrl: string | undefined;

export function rememberUmtDocumentationUrl(url: string | undefined): void {
  documentationUrl = url;
}

/** Opens the documentation in a new tab; does nothing until the link is known. */
export function openUmtDocumentation(): void {
  if (documentationUrl) window.open(documentationUrl, "_blank", "noopener,noreferrer");
}
