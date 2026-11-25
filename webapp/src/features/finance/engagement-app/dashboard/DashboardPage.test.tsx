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
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dashboard } from "../api/engagementTypes";

const q = (over: object = {}) => ({ data: undefined, isPending: true, isError: false, isFetching: false, isPlaceholderData: false, refetch: vi.fn(), ...over });

const state = vi.hoisted(() => ({
  catalogue: {} as Record<string, unknown>,
  groups: [] as Record<string, unknown>[],
  costEnabled: [] as boolean[],
  groupCalls: [] as { sections: readonly (readonly string[])[]; enabled: readonly boolean[] }[],
  costParams: [] as object[],
}));

vi.mock("../api/useEngagementApi", () => ({
  useDashboard: () => ({ data: undefined, isError: false, isFetching: false, refetch: vi.fn() }),
  useDashboardCatalogue: () => state.catalogue,
  useDashboardSectionGroups: (sections: readonly (readonly string[])[], enabled: readonly boolean[]) => {
    state.groupCalls.push({ sections, enabled });
    return sections.map((_, i) => state.groups[i] ?? q());
  },
  useReferenceData: () => q(),
  useAllocationsToday: () => q(),
  useTravelCostTransactions: () => q(),
  useTravelCosts: (params: object, enabled: boolean) => {
    state.costParams.push(params);
    state.costEnabled.push(enabled);
    return q();
  },
}));
vi.mock("../api/useEngagementUserInfo", () => ({ useEngagementAccess: () => ({ isAgent: false, p: { a: new Set() } }) }));
vi.mock("@hooks/useAsgardeoUser", () => ({ useAsgardeoUser: () => ({ email: "a@wso2.com", givenName: "Ayesha" }) }));
vi.mock("./travelCosts/useCostCsv", () => ({ useCostCsv: () => () => Promise.resolve() }));

import DashboardPage from "./DashboardPage";

const widgets = [
  { id: "waiting-on-you", defaultOn: true },
  { id: "tt-glance", defaultOn: true },
  { id: "em-starting-14", defaultOn: true },
  { id: "tc-kpis", defaultOn: true },
];

function page() {
  return render(
    <MemoryRouter initialEntries={["/finance/engagement-app/dashboard"]}>
      <DashboardPage />
    </MemoryRouter>,
  );
}
const catalogue = (d: Partial<Dashboard>) => q({ data: { failed: [], widgets, ...d }, isPending: false });

describe("DashboardPage loading", () => {
  beforeEach(() => {
    sessionStorage.clear();
    state.groups = [];
    state.costEnabled = [];
    state.costParams = [];
    state.groupCalls = [];
  });

  it("draws the header and every widget's frame as soon as the widget list is known, before any section arrives", () => {
    state.catalogue = catalogue({});
    page();
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy();
    for (const name of ["Waiting on You", "Travel Team at a Glance", "Allocations Starting in 14 Days", "Travel Cost Summary"]) {
      expect(screen.getByRole("region", { name })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: /^Manage Widgets/ })).toBeTruthy();
  });

  it("asks for each section in its own request, the ones that share an entity call together", () => {
    state.catalogue = catalogue({});
    page();
    const last = state.groupCalls.at(-1)!;
    expect(last.sections).toEqual([["waitingOnYou"], ["travelTeam"], ["engagementManager"]]);
    expect(last.enabled).toEqual([true, true, true]);
  });

  it("does not ask for the costs before the business date is known, then asks for the period ending on it", () => {
    state.catalogue = catalogue({});
    const first = page();
    expect(state.costEnabled.every((on) => !on)).toBe(true);
    first.unmount();
    state.costEnabled = [];
    state.costParams = [];
    state.catalogue = catalogue({ date: "2026-11-24" });
    page();
    expect(state.costEnabled.at(-1)).toBe(true);
    expect(state.costParams.at(-1)).toMatchObject({ from: "2026-01-01", to: "2026-11-24" });
    expect(screen.getByText(/stand on 24 Nov/)).toBeTruthy();
  });

  it("shows one skeleton for the whole area, and nothing else, while the widget list is unknown", () => {
    state.catalogue = q();
    const { container } = page();
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy();
    expect(screen.queryByRole("region")).toBeNull();
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBe(1);
  });

  it("gives a widget whose section failed its own Retry and leaves the others alone", () => {
    state.catalogue = catalogue({});
    state.groups = [
      q({ data: { failed: [], queue: [{ key: "k", label: "To approve", count: 2, highlighted: false }] }, isPending: false }),
      q({ data: { failed: ["travelTeam"] }, isPending: false }),
    ];
    page();
    expect(screen.getByText("To approve")).toBeTruthy();
    expect(screen.getByText(/Couldn.t load Travel Team at a Glance/)).toBeTruthy();
  });

  it("draws an ordinary employee's one widget, or none, with no skeleton for widgets they cannot have", () => {
    state.catalogue = catalogue({ widgets: [{ id: "allocations-today", defaultOn: false }] });
    const { container } = page();
    expect(screen.getByText("Every widget is hidden")).toBeTruthy();
    expect(screen.queryByRole("region")).toBeNull();
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBe(0);
    expect(state.groupCalls.at(-1)!.sections).toEqual([]);
  });

  it("counts the enabled widgets on Manage Widgets, in the badge and in the button's name, and follows a preference change", () => {
    state.catalogue = catalogue({});
    page();
    // The open dialog hides the page behind it from the accessibility tree, hence hidden: true.
    const button = () => screen.getByRole("button", { name: /^Manage Widgets, /, hidden: true });
    expect(button().getAttribute("aria-label")).toBe("Manage Widgets, All 4 widgets enabled");
    expect(button().parentElement?.textContent).toContain("4");
    fireEvent.click(button());
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("checkbox", { name: /Waiting on You/ }));
    expect(button().getAttribute("aria-label")).toBe("Manage Widgets, 3 of 4 widgets enabled, 1 hidden");
    expect(button().parentElement?.textContent).toContain("3");
  });

  it("shows a zero count when every widget is turned off", () => {
    state.catalogue = catalogue({ widgets: [{ id: "waiting-on-you", defaultOn: false }] });
    page();
    const button = screen.getAllByRole("button", { name: /^Manage Widgets, / })[0];
    expect(button.getAttribute("aria-label")).toBe("Manage Widgets, 0 of 1 widgets enabled, 1 hidden");
    expect(button.parentElement?.textContent).toContain("0");
  });
});
