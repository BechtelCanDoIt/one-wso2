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
import type { Dashboard } from "../../api/engagementTypes";
import { sectionOfWidget, widgetById } from "./registry";
import type { DashboardSectionKey, SectionState, WidgetCtx } from "./types";
import { extraSections, mergeDashboards, widgetState } from "./widgetState";

const costQuery = (q: Partial<{ isPending: boolean; isError: boolean; error: Error; data: unknown }>) => ({ isPending: false, isError: false, ...q }) as never;

function ctx(over: { section?: (k: DashboardSectionKey) => SectionState; dashboard?: Dashboard; cost?: unknown } = {}): WidgetCtx {
  return {
    today: "2026-11-24",
    businessDate: "2026-11-24",
    dashboard: over.dashboard,
    section: over.section ?? (() => ({ status: "loaded" })),
    retry: () => undefined,
    retrying: false,
    allocationsToday: { businessUnit: "", date: "", query: costQuery({}), change: () => undefined },
    cost: { query: over.cost ?? costQuery({}) } as never,
  };
}

describe("widgetState for a dashboard widget", () => {
  const waiting = widgetById("waiting-on-you")!;

  it("is loading while its section is, and failed when its section failed", () => {
    expect(widgetState(waiting, ctx({ section: () => ({ status: "loading" }) }))).toEqual({ kind: "loading" });
    expect(widgetState(waiting, ctx({ section: () => ({ status: "failed" }) }))).toEqual({ kind: "failed", error: undefined });
  });

  it("is empty with no tiles and ready with some", () => {
    expect(widgetState(waiting, ctx({ dashboard: { failed: [], queue: [] } })).kind).toBe("empty");
    expect(widgetState(waiting, ctx({ dashboard: { failed: [], queue: [{ key: "k", label: "L", count: 0, highlighted: false }] } })).kind).toBe("ready");
  });
});

describe("widgetState for a role widget whose part the backend left out", () => {
  it("is absent when the section loaded without the part, and ready when the part came back", () => {
    const glance = widgetById("tt-glance")!;
    const poAge = widgetById("tt-po-age")!;
    const onlyGlance: Dashboard = { failed: [], travelTeam: { awayThisWeek: { travellers: 1, countries: 1 }, endedNotCompleted: 0, poQueue: { count: 0, oldestDays: 0 } } };
    expect(widgetState(glance, ctx({ dashboard: onlyGlance })).kind).toBe("ready");
    expect(widgetState(poAge, ctx({ dashboard: onlyGlance })).kind).toBe("absent");
    expect(widgetState(poAge, ctx({ dashboard: { failed: [] } })).kind).toBe("absent");
  });

  it("keeps loading and failed ahead of absent", () => {
    expect(widgetState(widgetById("em-no-consultants")!, ctx({ section: () => ({ status: "loading" }) })).kind).toBe("loading");
  });
});

describe("widgetState for a cost widget", () => {
  const source = widgetById("tc-source")!;
  const data = (value: number) => ({ bySource: [{ key: "invoice", label: "Travel Invoices", value }] });

  it("follows the one summary query", () => {
    expect(widgetState(source, ctx({ cost: costQuery({ isPending: true }) })).kind).toBe("loading");
    expect(widgetState(source, ctx({ cost: costQuery({ isError: true, error: new Error("no") }) })).kind).toBe("failed");
    expect(widgetState(source, ctx({ cost: costQuery({ data: data(0) }) })).kind).toBe("empty");
    expect(widgetState(source, ctx({ cost: costQuery({ data: data(5) }) })).kind).toBe("ready");
  });

  it("shows an earlier answer while a new one loads rather than a skeleton", () => {
    expect(widgetState(source, ctx({ cost: costQuery({ isPending: false, data: data(5) }) })).kind).toBe("ready");
  });
});

describe("widgetState for a widget that runs its own queries", () => {
  it("is always ready, so its body shows its own states", () => {
    expect(widgetState(widgetById("tc-lines")!, ctx({ cost: costQuery({ isPending: true }) })).kind).toBe("ready");
    expect(widgetState(widgetById("allocations-today")!, ctx()).kind).toBe("ready");
  });
});

describe("extraSections", () => {
  const allowed = [
    { id: "waiting-on-you", defaultOn: true },
    { id: "tt-glance", defaultOn: true },
    { id: "tt-frequent", defaultOn: false },
    { id: "ev-by-month", defaultOn: false },
    { id: "tc-lines", defaultOn: false },
  ];

  it("asks only for sections no default-on widget already brings", () => {
    expect(extraSections(allowed, ["waiting-on-you", "tt-frequent", "ev-by-month", "tc-lines"], sectionOfWidget)).toEqual(["marketingEvents"]);
  });

  it("asks for nothing when nothing extra is on", () => {
    expect(extraSections(allowed, ["waiting-on-you"], sectionOfWidget)).toEqual([]);
  });

  it("asks once for a section behind several widgets", () => {
    const a = [{ id: "ev-by-month", defaultOn: false }, { id: "ev-by-region", defaultOn: false }];
    expect(extraSections(a, ["ev-by-month", "ev-by-region"], sectionOfWidget)).toEqual(["marketingEvents"]);
  });
});

describe("mergeDashboards", () => {
  const base: Dashboard = { failed: ["travel"], widgets: [{ id: "a", defaultOn: true }], queue: [] };

  it("returns the default when there is nothing extra", () => {
    expect(mergeDashboards(base, undefined)).toBe(base);
  });

  it("adds the extra sections, keeps the default ones and unites failures", () => {
    const extra: Dashboard = { failed: ["marketingEvents"], marketingEvents: { byMonth: [], byRegion: [], fundingByBusinessUnit: [] } };
    const merged = mergeDashboards(base, extra)!;
    expect(merged.marketingEvents).toBeDefined();
    expect(merged.queue).toBe(base.queue);
    expect(merged.failed).toEqual(["travel", "marketingEvents"]);
    expect(merged.widgets).toBe(base.widgets);
  });
});

describe("widgetState for a visible list widget with nothing to show", () => {
  it("is empty, not absent, when the section came back without the list (an older backend dropped the empty one)", () => {
    const workload = widgetById("tt-agent-workload")!;
    const frequent = widgetById("tt-frequent")!;
    const section: Dashboard = { failed: [], travelTeam: { awayThisWeek: { travellers: 1, countries: 1 }, endedNotCompleted: 0, poQueue: { count: 0, oldestDays: 0 } } };
    expect(widgetState(workload, ctx({ dashboard: section })).kind).toBe("empty");
    expect(widgetState(frequent, ctx({ dashboard: section })).kind).toBe("empty");
    expect(widgetState(workload, ctx({ dashboard: { ...section, travelTeam: { ...section.travelTeam!, agentWorkload: [] } } })).kind).toBe("empty");
    expect(widgetState(workload, ctx({ dashboard: { failed: [] } })).kind).toBe("absent");
  });
});
