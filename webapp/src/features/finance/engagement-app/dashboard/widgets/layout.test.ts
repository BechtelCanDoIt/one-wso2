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

import { describe, expect, it } from "vitest";
import { layoutBlocks, legacyWidgets } from "./layout";
import { WIDGETS, WIDGET_IDS, widgetById } from "./registry";
import type { WidgetDef } from "./types";

const ids = (...x: string[]): WidgetDef[] => x.map((id) => widgetById(id)!);
const shape = (defs: WidgetDef[]) => layoutBlocks(defs).map((b) => (b.kind === "controls" ? "controls" : b.kind === "full" ? b.def.id : b.defs.map((d) => d.id).join("+")));

describe("layoutBlocks", () => {
  it("puts full widgets on their own and runs of half widgets side by side", () => {
    expect(shape(ids("waiting-on-you", "engagements", "available-consultants", "allocations-today"))).toEqual(["waiting-on-you", "engagements+available-consultants", "allocations-today"]);
  });

  it("adds the controls once, above the first Travel Costs widget", () => {
    expect(shape(ids("waiting-on-you", "tc-source", "tc-month", "tc-kpis"))).toEqual(["waiting-on-you", "controls", "tc-source+tc-month", "tc-kpis"]);
  });

  it("adds the controls for Transactions alone", () => {
    expect(shape(ids("tc-lines"))).toEqual(["controls", "tc-lines"]);
  });

  it("adds no controls without a Travel Costs widget", () => {
    expect(shape(ids("travel"))).toEqual(["travel"]);
  });

  it("does not merge half widgets split by a full one", () => {
    expect(shape(ids("tc-source", "tc-lines", "tc-month"))).toEqual(["controls", "tc-source", "tc-lines", "tc-month"]);
  });
});

describe("legacyWidgets", () => {
  it("offers what an older backend sent, all on by default", () => {
    const refs = legacyWidgets({ failed: [], queue: [], travel: undefined, available: { available: 1, allocated: 1, byBusinessUnit: [] } }, true);
    expect(refs).toEqual([
      { id: "waiting-on-you", defaultOn: true },
      { id: "available-consultants", defaultOn: true },
      { id: "allocations-today", defaultOn: true },
    ]);
  });

  it("keeps Waiting on You when its section failed, and drops it when it was left out on purpose", () => {
    expect(legacyWidgets({ failed: ["waitingOnYou"] }, false)).toEqual([{ id: "waiting-on-you", defaultOn: true }]);
    expect(legacyWidgets({ failed: [], queue: [] }, false)).toEqual([{ id: "waiting-on-you", defaultOn: true }]);
    expect(legacyWidgets({ failed: [] }, false)).toEqual([]);
  });

  it("offers a section that failed, so its widget can say so", () => {
    expect(legacyWidgets({ failed: ["travel"] }, false)).toEqual([{ id: "travel", defaultOn: true }]);
  });
});

describe("registry", () => {
  it("has a unique id per widget, in catalogue order, and every widget has a heading and an empty text", () => {
    expect(new Set(WIDGET_IDS).size).toBe(WIDGETS.length);
    expect(WIDGET_IDS.slice(0, 2)).toEqual(["waiting-on-you", "tc-kpis"]);
    for (const w of WIDGETS) {
      expect(w.title).not.toBe("");
      expect(w.empty).not.toBe("");
      expect(w.title + w.empty + (typeof w.note === "string" ? w.note : "")).not.toContain(";");
    }
  });

  it("reads each dashboard widget from a section and each cost widget from the summary", () => {
    for (const w of WIDGETS) {
      if (w.source === "dashboard") expect(w.section, w.id).toBeDefined();
      if (w.source === "cost") expect(w.group, w.id).toBe("travelCosts");
    }
  });

  it("offers an export only on Travel Costs widgets", () => {
    for (const w of WIDGETS) if (w.csv) expect(w.group).toBe("travelCosts");
    expect(widgetById("tc-lines")?.csv).toBe("transactions");
  });
});
