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

import { useCallback, useEffect, useState } from "react";
import type { WidgetRef } from "../../api/dashboardTypes";

// Which widgets a person has hidden, shown or pinned. Kept in this browser, keyed by their email and a schema version.
// The page works with storage blocked: the state lives in React and storage is only a copy.

export const PREFS_VERSION = 1;
const KEY_BASE = "ea.dashboard.widgets.v1";

export interface WidgetPrefs {
  readonly v: typeof PREFS_VERSION;
  /** Default-on widgets the person turned off. */
  readonly hidden: readonly string[];
  /** Default-off widgets the person turned on. */
  readonly shown: readonly string[];
  /** In the order they were pinned. */
  readonly pinned: readonly string[];
}

export const DEFAULT_PREFS: WidgetPrefs = { v: PREFS_VERSION, hidden: [], shown: [], pinned: [] };

export const prefsKey = (email: string): string => `${KEY_BASE}:${email.trim().toLowerCase()}`;

const strings = (x: unknown): string[] | undefined => (Array.isArray(x) && x.every((i) => typeof i === "string") ? (x as string[]) : undefined);

/** What a stored string says. Anything that is not the current shape reads as the defaults. */
export function parsePrefs(raw: string | null): WidgetPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const x: unknown = JSON.parse(raw);
    if (typeof x !== "object" || x === null) return DEFAULT_PREFS;
    const o = x as Record<string, unknown>;
    const hidden = strings(o.hidden);
    const shown = strings(o.shown);
    const pinned = strings(o.pinned);
    if (o.v !== PREFS_VERSION || !hidden || !shown || !pinned) return DEFAULT_PREFS;
    return { v: PREFS_VERSION, hidden, shown, pinned };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function readPrefs(email: string): WidgetPrefs {
  try {
    return parsePrefs(localStorage.getItem(prefsKey(email)));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(email: string, prefs: WidgetPrefs): void {
  try {
    localStorage.setItem(prefsKey(email), JSON.stringify(prefs));
  } catch {
    // Storage is blocked or full: the choice lasts until the page is closed.
  }
}

export function clearPrefs(email: string): void {
  try {
    localStorage.removeItem(prefsKey(email));
  } catch {
    // Nothing stored that could be removed.
  }
}

/** The ids on screen: allowed for this person, not hidden, and on by default or turned on by them. Ids the backend no longer lists are ignored. */
export function visibleIds(allowed: readonly WidgetRef[], prefs: WidgetPrefs): string[] {
  return allowed.filter((w) => !prefs.hidden.includes(w.id) && (w.defaultOn || prefs.shown.includes(w.id))).map((w) => w.id);
}

/** Pinned widgets first, in pin order, then the rest in catalogue order. */
export function orderWidgets(ids: readonly string[], pinned: readonly string[], catalogue: readonly string[]): string[] {
  const set = new Set(ids);
  const top = pinned.filter((id) => set.has(id));
  const rest = catalogue.filter((id) => set.has(id) && !top.includes(id));
  // An id the catalogue does not know still shows, last.
  const unknown = ids.filter((id) => !top.includes(id) && !rest.includes(id));
  return [...top, ...rest, ...unknown];
}

const without = (list: readonly string[], id: string): string[] => list.filter((x) => x !== id);
const withId = (list: readonly string[], id: string): string[] => (list.includes(id) ? [...list] : [...list, id]);

/**
 * Show or hide one widget. A default-on one is tracked in `hidden`, a default-off one in `shown`. The other list is cleared
 * too, because the backend may have changed the widget's default since the person last chose, and a stale entry would win.
 */
export function setVisible(prefs: WidgetPrefs, ref: WidgetRef, visible: boolean): WidgetPrefs {
  if (visible) return { ...prefs, hidden: without(prefs.hidden, ref.id), shown: ref.defaultOn ? without(prefs.shown, ref.id) : withId(prefs.shown, ref.id) };
  return { ...prefs, shown: without(prefs.shown, ref.id), hidden: ref.defaultOn ? withId(prefs.hidden, ref.id) : without(prefs.hidden, ref.id) };
}

export function togglePinned(prefs: WidgetPrefs, id: string): WidgetPrefs {
  return { ...prefs, pinned: prefs.pinned.includes(id) ? without(prefs.pinned, id) : [...prefs.pinned, id] };
}

/** The person's choices, for the signed-in `email`. Nothing is read or written until the email is known. */
export function useWidgetPrefs(email: string | undefined): {
  readonly prefs: WidgetPrefs;
  readonly update: (change: (p: WidgetPrefs) => WidgetPrefs) => void;
  readonly reset: () => void;
} {
  const [state, setState] = useState<{ email?: string; prefs: WidgetPrefs }>({ prefs: DEFAULT_PREFS });
  // Load once the email is known, and again if it changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the store is an external system read after sign-in
    setState({ email, prefs: email ? readPrefs(email) : DEFAULT_PREFS });
  }, [email]);
  const update = useCallback(
    (change: (p: WidgetPrefs) => WidgetPrefs) => {
      setState((s) => {
        const prefs = change(s.prefs);
        if (s.email) writePrefs(s.email, prefs);
        return { ...s, prefs };
      });
    },
    [],
  );
  const reset = useCallback(() => {
    setState((s) => {
      if (s.email) clearPrefs(s.email);
      return { ...s, prefs: DEFAULT_PREFS };
    });
  }, []);
  return { prefs: state.prefs, update, reset };
}
