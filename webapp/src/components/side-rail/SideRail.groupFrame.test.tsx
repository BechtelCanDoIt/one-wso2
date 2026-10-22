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

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AwardIcon, NetworkIcon, UsersIcon } from "@wso2/oxygen-ui-icons-react";

// Same seams as SideRail.userGuide.test.tsx: the GRC fetch shim, the active
// perspective, and the visibility gates.
vi.mock("@features/security/grc/shim/useAuthApiClient", () => ({
  useAuthApiClient: () => vi.fn(),
}));
vi.mock("@context/perspective/PerspectiveContext", () => ({
  useActivePerspective: () => ({
    key: "people",
    label: "People Ops",
    icon: UsersIcon,
    path: "/people-ops",
    forwardsToFirstItem: true,
    sections: [
      { id: "org-chart", label: "Org Chart", icon: NetworkIcon, path: "/people-ops/org-chart" },
      {
        id: "promotion",
        label: "Promotion",
        icon: AwardIcon,
        children: [
          { id: "promotion-lead", label: "Lead", path: "/people-ops/promotion/lead" },
          { id: "promotion-board", label: "Board", path: "/people-ops/promotion/board" },
        ],
      },
    ],
  }),
}));
vi.mock("./usePerspectiveVisibility", () => ({
  usePerspectiveVisibility: () => ({ resolveVisible: () => true }),
}));

import SideRail from "./SideRail";

function renderSideRail({ collapsed, at }: { collapsed: boolean; at: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[at]}>
        <SideRail collapsed={collapsed} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const px = (value: string) => parseFloat(value) || 0;

function horizontalSpace(el: Element): number {
  const s = getComputedStyle(el);
  return (
    px(s.marginLeft) + px(s.marginRight) +
    px(s.paddingLeft) + px(s.paddingRight) +
    px(s.borderLeftWidth) + px(s.borderRightWidth)
  );
}

function verticalSpace(el: Element): number {
  const s = getComputedStyle(el);
  return (
    px(s.marginTop) + px(s.marginBottom) +
    px(s.paddingTop) + px(s.paddingBottom) +
    px(s.borderTopWidth) + px(s.borderBottomWidth)
  );
}

/**
 * Every element a group adds between the list the plain rows sit in and one of
 * the group's own rows, labelled with the space it takes, so a failure names
 * the element that moved the row.
 */
function wrappersAround(rowName: string, measure: (el: Element) => number): string[] {
  const plainRowList = screen.getByRole("button", { name: "Org Chart" }).closest("ul");
  const wrappers: string[] = [];
  let el = screen.getByRole("button", { name: rowName }).parentElement;
  while (el && el !== plainRowList) {
    wrappers.push(`${el.tagName.toLowerCase()}.${el.className.split(" ")[0]} ${measure(el)}px`);
    el = el.parentElement;
  }
  expect(el, "the group should sit in the same list as the plain rows").toBe(plainRowList);
  return wrappers;
}

const takingNoSpace = (wrappers: string[]) => wrappers.map((w) => w.replace(/ [\d.]+px$/, " 0px"));

// jsdom does no layout, so this can't measure where a row's icon and label
// land. It checks what decides that instead: Oxygen insets every row the same
// way, so a group's rows share the plain rows' icon and label columns exactly
// when nothing the group wraps them in takes horizontal room. A frame drawn
// with margin and border did, even while it was transparent.
describe("SideRail group rows", () => {
  it("line up with the plain rows while the group is open", () => {
    renderSideRail({ collapsed: false, at: "/people-ops/promotion/lead" });
    expect(screen.getByRole("button", { name: "Promotion" })).toHaveAttribute("aria-expanded", "true");

    const header = wrappersAround("Promotion", horizontalSpace);
    expect(header).toEqual(takingNoSpace(header));
    const child = wrappersAround("Board", horizontalSpace);
    expect(child).toEqual(takingNoSpace(child));
  });

  it("line up with, and are as tall as, the plain rows while the group is closed", () => {
    renderSideRail({ collapsed: false, at: "/people-ops/org-chart" });
    expect(screen.getByRole("button", { name: "Promotion" })).toHaveAttribute("aria-expanded", "false");

    const across = wrappersAround("Promotion", horizontalSpace);
    expect(across).toEqual(takingNoSpace(across));
    const down = wrappersAround("Promotion", verticalSpace);
    expect(down).toEqual(takingNoSpace(down));
  });

  it("line up with the plain rows on the collapsed rail", () => {
    renderSideRail({ collapsed: true, at: "/people-ops/promotion/lead" });

    const across = wrappersAround("Promotion", horizontalSpace);
    expect(across).toEqual(takingNoSpace(across));
  });
});
