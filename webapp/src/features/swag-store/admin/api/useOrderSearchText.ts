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

import { useState } from "react";
import { useSwagStoreBasis } from "../../api/swagStoreBasis";

const storageKey = (sub: string | undefined) =>
  `swag-store:${sub ?? "anonymous"}:admin-orders-search`;

function readSearch(sub: string | undefined): string {
  try {
    return window.sessionStorage.getItem(storageKey(sub)) ?? "";
  } catch {
    return "";
  }
}

function writeSearch(sub: string | undefined, q: string): void {
  try {
    if (q) window.sessionStorage.setItem(storageKey(sub), q);
    else window.sessionStorage.removeItem(storageKey(sub));
  } catch {
    // Storage can be blocked. The search then lasts only for this page.
  }
}

/**
 * The admin orders search text. It can be an email address, so it is kept for
 * the tab (per signed-in person) instead of in the address, which ends up in
 * browser history and in every link copied from the page. It still survives
 * opening an order and coming back, and a reload.
 */
export function useOrderSearchText(): readonly [string, (q: string) => void] {
  const { sub } = useSwagStoreBasis();
  const [q, setQ] = useState(() => readSearch(sub));
  const set = (next: string) => {
    setQ(next);
    writeSearch(sub, next);
  };
  return [q, set];
}
