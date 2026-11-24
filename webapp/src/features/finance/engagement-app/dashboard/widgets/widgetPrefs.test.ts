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
import { renderHook, act } from "@testing-library/react";
import {
  DEFAULT_PREFS,
  clearPrefs,
  orderWidgets,
  parsePrefs,
  prefsKey,
  readPrefs,
  setVisible,
  togglePinned,
  useWidgetPrefs,
  visibleIds,
  writePrefs,
} from "./widgetPrefs";

const allowed = [
  { id: "a", defaultOn: true },
  { id: "b", defaultOn: true },
  { id: "c", defaultOn: false },
];

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("parsePrefs", () => {
  it("reads the defaults for nothing, corrupt JSON, another version or the wrong shape", () => {
    expect(parsePrefs(null)).toBe(DEFAULT_PREFS);
    expect(parsePrefs("{not json")).toBe(DEFAULT_PREFS);
    expect(parsePrefs(JSON.stringify({ v: 2, hidden: [], shown: [], pinned: [] }))).toBe(DEFAULT_PREFS);
    expect(parsePrefs(JSON.stringify({ v: 1, hidden: "a", shown: [], pinned: [] }))).toBe(DEFAULT_PREFS);
    expect(parsePrefs(JSON.stringify({ v: 1, hidden: [1], shown: [], pinned: [] }))).toBe(DEFAULT_PREFS);
    expect(parsePrefs("null")).toBe(DEFAULT_PREFS);
  });

  it("reads a good value", () => {
    expect(parsePrefs(JSON.stringify({ v: 1, hidden: ["a"], shown: ["c"], pinned: ["b"] }))).toEqual({ v: 1, hidden: ["a"], shown: ["c"], pinned: ["b"] });
  });
});

describe("storage", () => {
  it("keys by the lower-cased email and the schema version", () => {
    expect(prefsKey(" Ada@WSO2.com ")).toBe("ea.dashboard.widgets.v1:ada@wso2.com");
  });

  it("keeps one person's choices apart from another's", () => {
    writePrefs("a@wso2.com", { ...DEFAULT_PREFS, hidden: ["x"] });
    expect(readPrefs("a@wso2.com").hidden).toEqual(["x"]);
    expect(readPrefs("b@wso2.com")).toBe(DEFAULT_PREFS);
  });

  it("falls back to the defaults when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readPrefs("a@wso2.com")).toBe(DEFAULT_PREFS);
    expect(() => writePrefs("a@wso2.com", DEFAULT_PREFS)).not.toThrow();
    expect(() => clearPrefs("a@wso2.com")).not.toThrow();
  });
});

describe("visibleIds", () => {
  it("shows default-on widgets and hides default-off ones", () => {
    expect(visibleIds(allowed, DEFAULT_PREFS)).toEqual(["a", "b"]);
  });

  it("honours hidden and shown", () => {
    expect(visibleIds(allowed, { ...DEFAULT_PREFS, hidden: ["a"], shown: ["c"] })).toEqual(["b", "c"]);
  });

  it("ignores ids the backend does not list", () => {
    expect(visibleIds(allowed, { ...DEFAULT_PREFS, hidden: ["zzz"], shown: ["old-widget"] })).toEqual(["a", "b"]);
  });

  it("does not show a widget the person may not see even if they once turned it on", () => {
    expect(visibleIds([{ id: "a", defaultOn: true }], { ...DEFAULT_PREFS, shown: ["c"] })).toEqual(["a"]);
  });
});

describe("orderWidgets", () => {
  const catalogue = ["a", "b", "c", "d"];

  it("puts pinned widgets first, in pin order, then the rest in catalogue order", () => {
    expect(orderWidgets(["a", "b", "c", "d"], ["c", "a"], catalogue)).toEqual(["c", "a", "b", "d"]);
  });

  it("ignores a pinned widget that is not on screen", () => {
    expect(orderWidgets(["a", "b"], ["d", "b"], catalogue)).toEqual(["b", "a"]);
  });

  it("keeps an id the catalogue does not know, last", () => {
    expect(orderWidgets(["a", "x"], [], catalogue)).toEqual(["a", "x"]);
  });
});

describe("setVisible and togglePinned", () => {
  it("hides a default-on widget through hidden and brings it back", () => {
    const hidden = setVisible(DEFAULT_PREFS, allowed[0], false);
    expect(hidden.hidden).toEqual(["a"]);
    expect(setVisible(hidden, allowed[0], true).hidden).toEqual([]);
  });

  it("shows and hides a default-off widget through shown", () => {
    const on = setVisible(DEFAULT_PREFS, allowed[2], true);
    expect(on.shown).toEqual(["c"]);
    expect(setVisible(on, allowed[2], false).shown).toEqual([]);
  });

  it("does not list an id twice", () => {
    const once = setVisible(DEFAULT_PREFS, allowed[0], false);
    expect(setVisible(once, allowed[0], false).hidden).toEqual(["a"]);
  });

  it("pins and unpins", () => {
    const pinned = togglePinned(DEFAULT_PREFS, "b");
    expect(pinned.pinned).toEqual(["b"]);
    expect(togglePinned(pinned, "b").pinned).toEqual([]);
  });
});

describe("useWidgetPrefs", () => {
  it("reads nothing and writes nothing until the email is known", () => {
    const { result } = renderHook(() => useWidgetPrefs(undefined));
    act(() => result.current.update((p) => togglePinned(p, "a")));
    expect(result.current.prefs.pinned).toEqual(["a"]);
    expect(localStorage.length).toBe(0);
  });

  it("saves a change under the person's key and resets by removing it", () => {
    const { result } = renderHook(() => useWidgetPrefs("a@wso2.com"));
    act(() => result.current.update((p) => togglePinned(p, "a")));
    expect(JSON.parse(localStorage.getItem(prefsKey("a@wso2.com"))!)).toMatchObject({ pinned: ["a"] });
    act(() => result.current.reset());
    expect(localStorage.getItem(prefsKey("a@wso2.com"))).toBeNull();
    expect(result.current.prefs).toBe(DEFAULT_PREFS);
  });

  it("starts from what was saved", () => {
    writePrefs("a@wso2.com", { ...DEFAULT_PREFS, hidden: ["b"] });
    const { result } = renderHook(() => useWidgetPrefs("a@wso2.com"));
    expect(result.current.prefs.hidden).toEqual(["b"]);
  });

  it("keeps working in memory when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useWidgetPrefs("a@wso2.com"));
    act(() => result.current.update((p) => togglePinned(p, "a")));
    expect(result.current.prefs.pinned).toEqual(["a"]);
  });
});
