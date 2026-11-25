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

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TravelRequestSummary, UserInfo } from "../api/engagementTypes";

const state = {
  info: undefined as UserInfo | undefined,
  calls: [] as Record<string, unknown>[],
};

vi.mock("../search/GlobalSearch", () => ({ default: () => null }));
vi.mock("../api/useEngagementUserInfo", async () => {
  const { engagementAccess } = await import("../model/engagementAccess");
  return { useEngagementAccess: () => engagementAccess(state.info), useEngagementUserInfo: () => ({ data: state.info }) };
});
vi.mock("../api/useEngagementApi", () => ({
  useTravelRequests: (params: Record<string, unknown>) => {
    // The short New block above In Progress is its own call; keep it empty.
    if (params.segment === "new") return { data: { items: [], total: 0, counts: {} }, isPending: false, isError: false };
    state.calls.push(params);
    return { data: { items: [trip], total: 60, counts: {} }, isPending: false, isError: false, isPlaceholderData: false };
  },
  useReferenceData: () => ({ data: undefined }),
}));
vi.mock("./useTravelRowActions", () => ({ useTravelRowActions: () => ({ primary: () => undefined, menu: () => [], dialogs: null }) }));

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import TravelRequestsPage from "./TravelRequestsPage";

const trip = {
  jobNumber: "TRV-2026-10-0001",
  status: "In Progress",
  traveller: { email: "a@wso2.com", name: "A" },
  country: "Sri Lanka",
  city: "Colombo",
  start: "2026-12-07",
  end: "2026-12-11",
  travelAgent: "Acorn Travels",
} as unknown as TravelRequestSummary;

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.search}</div>;
}

const draw = (q = "") =>
  render(
    <MemoryRouter initialEntries={[`/finance/engagement-app/travel-requests/in-progress${q}`]}>
      <TravelRequestsPage segment="in-progress" />
      <Where />
    </MemoryRouter>,
  );

const last = () => state.calls[state.calls.length - 1];

beforeEach(() => {
  state.info = { email: "t@wso2.com", allocations: { privileges: [] }, travel: { privileges: [1, 2] } };
  state.calls = [];
});

describe("Travels sorting", () => {
  it("sends no sort by default", () => {
    draw();
    expect(last()).toMatchObject({ segment: "in-progress", sort: undefined, offset: 0 });
  });

  it("sends the sort from the address and keeps it out of the filters", () => {
    draw("?sort=-startDate&country=Sri%20Lanka");
    expect(last()).toMatchObject({ sort: "-startDate", country: ["Sri Lanka"] });
    expect(screen.getByRole("columnheader", { name: "Dates" })).toHaveAttribute("aria-sort", "descending");
  });

  it("leaves Traveller and Visa unsortable", () => {
    draw();
    expect(screen.queryByRole("button", { name: "Traveller" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Visa" })).toBeNull();
    for (const l of ["Job Number", "Destination", "Dates", "Travel Agent", "Travel Status"]) {
      expect(screen.getByRole("button", { name: l })).toBeInTheDocument();
    }
  });

  it("cycles a header through ascending, descending and the default, going back to the first page", () => {
    draw("?page=2");
    expect(last()).toMatchObject({ offset: 50 });
    fireEvent.click(screen.getByRole("button", { name: "Travel Agent" }));
    expect(screen.getByTestId("where")).toHaveTextContent("?sort=agency");
    expect(last()).toMatchObject({ sort: "agency", offset: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Travel Agent" }));
    expect(last()).toMatchObject({ sort: "-agency", offset: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Travel Agent" }));
    expect(screen.getByTestId("where")).toHaveTextContent(/^$/);
    expect(last()).toMatchObject({ sort: undefined, offset: 0 });
  });

  it("keeps the sort when the search changes", () => {
    draw("?sort=destination&q=colombo");
    expect(last()).toMatchObject({ sort: "destination", search: "colombo" });
  });
});
