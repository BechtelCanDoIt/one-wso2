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

// Opening LinkedIn's consent page in a new tab without tripping the popup
// blocker — or reporting a block that did not happen.
//
// Two traps, both hit by the first version of this code:
//
//  1. `window.open(url, "_blank", "noopener")` ALWAYS returns null (HTML spec:
//     with `noopener` the opener gets no handle). So "null ⇒ blocked" was true
//     on every click, and every reader was told their browser blocked a window
//     that had in fact opened.
//
//  2. The authorization URL comes from `POST /connections/linkedin/start`, and
//     opening the tab only after that await (plus the token await) is outside
//     the click's user activation — Safari does block that one, for real.
//
// So: open a blank tab SYNCHRONOUSLY, inside the click (null here genuinely
// means blocked); then fetch the URL; then cut the opener link and navigate the
// tab. If the fetch fails, close the blank tab rather than strand it.

import { safeHttpUrl } from "./amplifyUi";

export type ConsentOpenResult =
  | { status: "opened" }
  | { status: "blocked" }
  | { status: "failed"; error: unknown };

/** Copy for the genuinely-blocked case, shared by both call sites. */
export const POPUP_BLOCKED_MESSAGE =
  "Your browser blocked the LinkedIn window. Allow pop-ups for One WSO2 and try again.";

/**
 * Must be CALLED from inside the click handler (not after an await): the
 * `window.open` below runs before this function's first await, so it still
 * holds the click's user activation.
 */
export async function openLinkedInConsent(
  getAuthorizationUrl: () => Promise<string>,
  win: Pick<Window, "open"> = window,
): Promise<ConsentOpenResult> {
  const tab = win.open("", "_blank");
  if (!tab) return { status: "blocked" };
  try {
    const url = safeHttpUrl(await getAuthorizationUrl());
    if (!url) throw new Error("The LinkedIn authorization address was not a web address.");
    // Sever the back-reference before handing the tab to a third party
    // (what `noopener` would have done, had it not hidden the handle).
    tab.opener = null;
    tab.location.href = url;
    return { status: "opened" };
  } catch (error) {
    try {
      tab.close();
    } catch {
      /* already gone */
    }
    return { status: "failed", error };
  }
}
