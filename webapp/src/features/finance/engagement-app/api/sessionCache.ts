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

// A short-lived copy of two cheap, slow-to-change answers (/user-info and the dashboard's widget catalogue) in sessionStorage, so a page
// reload can draw the page frame and each widget's frame at once. It is only a first guess: the query that owns the answer asks the
// backend again straight away (the copy counts as stale), the fresh answer replaces it, and the backend still checks every call.
// Held per signed-in subject and per browser tab, and gone with the tab.

const PREFIX = "ea.cache.v1.";
const MAX_AGE_MS = 60 * 60 * 1000;

interface Stored {
  readonly sub: string;
  readonly at: number;
  readonly data: unknown;
}

/** The copy saved for `sub` under `name`, or undefined when there is none, it is old, it is another person's, or storage is unavailable. */
export function readSessionCache<T>(name: string, sub: string | undefined, now: number = Date.now()): T | undefined {
  if (!sub) return undefined;
  try {
    const raw = sessionStorage.getItem(PREFIX + name);
    if (!raw) return undefined;
    const s = JSON.parse(raw) as Stored;
    if (s.sub !== sub || typeof s.at !== "number" || now - s.at > MAX_AGE_MS || now < s.at) return undefined;
    return s.data as T;
  } catch {
    return undefined;
  }
}

/** Saves `data` for `sub` under `name`; storage being full or blocked is not an error. */
export function writeSessionCache(name: string, sub: string | undefined, data: unknown, now: number = Date.now()): void {
  if (!sub) return;
  try {
    sessionStorage.setItem(PREFIX + name, JSON.stringify({ sub, at: now, data } satisfies Stored));
  } catch {
    // Not worth failing a request for.
  }
}

/** Forgets every copy (for tests). Nothing clears the cache on sign-out: a copy is only ever read for the same signed-in subject and goes with the tab. */
export function clearSessionCache(): void {
  try {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith(PREFIX)) sessionStorage.removeItem(k);
  } catch {
    // Nothing to clear.
  }
}
