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

// The feed's layouts, in the order the switcher shows them. Cards is today's
// layout and stays the default.
export const TIL_FEED_LAYOUTS = ["cards", "list", "small", "large"] as const;
export type TilFeedLayout = (typeof TIL_FEED_LAYOUTS)[number];
export const DEFAULT_TIL_FEED_LAYOUT: TilFeedLayout = "cards";

export const TIL_FEED_LAYOUT_LABELS: Record<TilFeedLayout, string> = {
  cards: "Cards",
  list: "List",
  small: "Small thumbnails",
  large: "Large thumbnails",
};

// The denser the layout, the more entries a page holds. Large thumbnails
// holds 12 so its grid's two- and three-column rows both come out full.
export const TIL_FEED_PAGE_SIZE: Record<TilFeedLayout, number> = {
  cards: 10,
  list: 25,
  small: 15,
  large: 12,
};

// Per browser, not per account: a layout is a reading preference for the
// screen in front of you, and keeping it here needs no backend change.
const STORAGE_KEY = "one-wso2.til.feed-layout";

function isTilFeedLayout(value: string | null): value is TilFeedLayout {
  return (TIL_FEED_LAYOUTS as readonly (string | null)[]).includes(value);
}

/** The layout this browser last used, or the default. */
export function readTilFeedLayout(): TilFeedLayout {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTilFeedLayout(stored) ? stored : DEFAULT_TIL_FEED_LAYOUT;
  } catch {
    return DEFAULT_TIL_FEED_LAYOUT;
  }
}

export function writeTilFeedLayout(layout: TilFeedLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, layout);
  } catch {
    /* ignore — a blocked localStorage just means the choice isn't remembered */
  }
}

/** The page that still shows the entry at `firstIndex` once pages hold
 * `pageSize` entries, so switching layout keeps your place in the feed
 * instead of jumping back to page one. */
export function pageContaining(firstIndex: number, pageSize: number): number {
  return Math.floor(Math.max(0, firstIndex) / pageSize) + 1;
}
