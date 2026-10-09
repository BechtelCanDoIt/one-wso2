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
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TIL_FEED_LAYOUT,
  TIL_FEED_LAYOUTS,
  TIL_FEED_PAGE_SIZE,
  pageContaining,
  readTilFeedLayout,
  writeTilFeedLayout,
} from "./tilFeedLayout";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("readTilFeedLayout / writeTilFeedLayout", () => {
  it("opens in Cards until a layout is chosen", () => {
    expect(DEFAULT_TIL_FEED_LAYOUT).toBe("cards");
    expect(readTilFeedLayout()).toBe("cards");
  });

  it("remembers the chosen layout", () => {
    writeTilFeedLayout("large");
    expect(readTilFeedLayout()).toBe("large");
  });

  it("ignores a stored value that isn't a layout", () => {
    localStorage.setItem("one-wso2.til.feed-layout", "magazine");
    expect(readTilFeedLayout()).toBe("cards");
  });

  it("falls back to the default when storage is blocked", () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writeTilFeedLayout("list")).not.toThrow();
    expect(readTilFeedLayout()).toBe("cards");
  });
});

describe("TIL_FEED_PAGE_SIZE", () => {
  it("has a page size for every layout, keeping Cards at today's 10", () => {
    for (const layout of TIL_FEED_LAYOUTS) expect(TIL_FEED_PAGE_SIZE[layout]).toBeGreaterThan(0);
    expect(TIL_FEED_PAGE_SIZE.cards).toBe(10);
  });

  it("fills every row of the large grid at one to four columns", () => {
    for (const columns of [1, 2, 3, 4]) expect(TIL_FEED_PAGE_SIZE.large % columns).toBe(0);
  });
});

describe("pageContaining", () => {
  it("keeps the first entry on screen when pages grow", () => {
    // Page 3 of Cards starts at entry 20; Lists of 25 hold it on page 1.
    expect(pageContaining(20, 25)).toBe(1);
    expect(pageContaining(30, 25)).toBe(2);
  });

  it("keeps the first entry on screen when pages shrink", () => {
    // Page 2 of List starts at entry 25; Cards of 10 hold it on page 3.
    expect(pageContaining(25, 10)).toBe(3);
  });

  it("starts at page one", () => {
    expect(pageContaining(0, 12)).toBe(1);
    expect(pageContaining(-1, 12)).toBe(1);
  });
});
