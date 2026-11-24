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
import type { UserInfo } from "../api/engagementTypes";

// NothingHere comes from PerspectiveLanding, whose visibility hook pulls
// @asgardeo/browser into the module graph; stubbed as Cado2Shell.test.tsx does.
vi.mock("@components/side-rail/usePerspectiveVisibility", () => ({
  usePerspectiveVisibility: () => ({ resolveVisible: () => true, isResolving: false, visibleLeaves: [], isError: false, retry: () => {} }),
}));

const state = {
  configured: true,
  info: { data: undefined as UserInfo | undefined, isPending: false, isLoading: false, isError: false, isFetching: false, error: null as unknown },
};
const refetch = vi.fn();
vi.mock("@config/apiConfig", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@config/apiConfig")>()),
  isEngagementAppBackendConfigured: () => state.configured,
}));
vi.mock("../api/useEngagementUserInfo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/useEngagementUserInfo")>();
  const { engagementAccess } = await import("../model/engagementAccess");
  return {
    ...actual,
    useEngagementUserInfo: () => ({ ...state.info, refetch }),
    useEngagementAccess: () => engagementAccess(state.info.data),
  };
});

// The screens have their own tests; here they only need to say where they are.
vi.mock("../dashboard/DashboardPage", () => ({ default: () => <h1>Dashboard page</h1> }));
vi.mock("../approvals/ApprovalsPage", async () => {
  const { Navigate } = await import("react-router");
  return {
    default: ({ segment }: { segment: string }) => <h1>Approvals {segment}</h1>,
    ApprovalsIndex: () => <Navigate to="/finance/engagement-app/approvals/internal" replace />,
  };
});
vi.mock("../settings/SettingsPage", () => ({ default: ({ tab }: { tab: string }) => <h1>Settings {tab}</h1>, SettingsIndex: () => <h1>Settings index</h1> }));
vi.mock("../travel/TravelRequestPage", async () => {
  const { useParams } = await import("react-router");
  return {
    default: function Trip({ area = "finance" }: { area?: string }) {
      const { job, tab } = useParams();
      return (
        <h1>
          Trip {job} {tab} {area}
        </h1>
      );
    },
  };
});
vi.mock("../me/MyAllocationsPage", () => ({ default: () => <h1>My allocations page</h1> }));
vi.mock("../me/MyTravelRequestsPage", () => ({ default: () => <h1>My travels page</h1> }));

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, useLocation } from "react-router";
import { engagementRoutes, myEngagementRoutes } from "../routes";

const user = (allocations: number[], travel: number[] = []): UserInfo => ({
  email: "jane@wso2.com",
  allocations: { privileges: allocations },
  travel: { privileges: travel },
});

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function open(at: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[at]}>
        <Where />
        <Routes>
          {engagementRoutes}
          {myEngagementRoutes}
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const where = () => screen.getByTestId("where").textContent;

beforeEach(() => {
  state.configured = true;
  state.info = { data: user([1], [49]), isPending: false, isLoading: false, isError: false, isFetching: false, error: null };
  refetch.mockClear();
});

describe("the Engagement App access ladder", () => {
  it("names the key to set when the backend isn't configured", () => {
    state.configured = false;
    open("/finance/engagement-app/dashboard");
    expect(screen.getByText(/isn.t connected yet/)).toBeInTheDocument();
    expect(screen.getByText("ONE_WSO2_ENGAGEMENT_APP_BACKEND_URL")).toBeInTheDocument();
  });

  it("holds the page, and redirects nothing, while access is being checked, saying so only if it takes a moment", async () => {
    state.info = { ...state.info, data: undefined, isPending: true };
    open("/finance/engagement-app/settings/allocation-types");
    expect(screen.queryByText("Checking your Engagement App access…")).toBeNull();
    expect(await screen.findByText("Checking your Engagement App access…")).toBeInTheDocument();
    expect(where()).toBe("/finance/engagement-app/settings/allocation-types");
  });

  it("offers Retry when the check itself failed, rather than claiming no access", () => {
    state.info = { ...state.info, data: undefined, isError: true, error: new Error("timeout") };
    open("/finance/engagement-app/dashboard");
    expect(screen.getByText(/Couldn't check your Engagement App access\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("Nothing here for you yet")).toBeNull();
  });

  it("shows the no-access page to someone with no Engagement App privilege, and no Me links", () => {
    state.info.data = user([], []);
    open("/finance/engagement-app/dashboard");
    expect(screen.getByText("You don't have access to the Engagement App")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Allocations" })).toBeNull();
  });

  it("keeps the shared Nothing-here card for the Me area when there is no Me access", () => {
    state.info.data = user([], []);
    open("/me/allocations");
    expect(screen.getByText("Nothing here for you yet")).toBeInTheDocument();
  });

  it("renders the page once allowed", async () => {
    state.info.data = user([1], [1, 2, 3]);
    open("/finance/engagement-app/dashboard");
    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
  });
});

describe("Engagement App routing", () => {
  it("lands someone with another Finance screen on the Dashboard", () => {
    state.info.data = user([1], [1, 2, 3]);
    open("/finance/engagement-app");
    expect(where()).toBe("/finance/engagement-app/dashboard");
  });

  it("tells a plain employee they have no access, rather than redirecting them to Me", () => {
    state.info.data = { ...user([1], [49]), accessRequestEmail: "wso2-digital-team@wso2.com" };
    open("/finance/engagement-app/dashboard");
    expect(where()).toBe("/finance/engagement-app/dashboard");
    expect(screen.getByRole("heading", { level: 1, name: "Engagement App" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "You don't have access to the Engagement App" })).toBeInTheDocument();
    expect(screen.getByText("Your own allocations and travels are under Me.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Allocations" })).toHaveAttribute("href", "/me/allocations");
    expect(screen.getByRole("link", { name: "Travels" })).toHaveAttribute("href", "/me/travel-requests");
    expect(screen.getByRole("link", { name: "wso2-digital-team@wso2.com" })).toHaveAttribute("href", "mailto:wso2-digital-team@wso2.com");
    expect(screen.getByText(/If you think you need access, email/)).toBeInTheDocument();
  });

  it("shows the same page at any Finance address, deep ones included", () => {
    open("/finance/engagement-app/travel-requests/TRV-1/info");
    expect(screen.getByText("You don't have access to the Engagement App")).toBeInTheDocument();
    expect(where()).toBe("/finance/engagement-app/travel-requests/TRV-1/info");
  });

  it("offers only the Me links the person can open", () => {
    state.info.data = user([], [36]);
    open("/finance/engagement-app");
    expect(screen.queryByRole("link", { name: "Allocations" })).toBeNull();
    expect(screen.getByRole("link", { name: "Travels" })).toBeInTheDocument();
  });

  it("leaves out the Me sentence when the person has neither Me page", () => {
    state.info.data = { ...user([], [19]), accessRequestEmail: "team@wso2.com" };
    open("/finance/engagement-app");
    expect(screen.getByText("You don't have access to the Engagement App")).toBeInTheDocument();
    expect(screen.queryByText(/Your own allocations and travels/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Allocations" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Travels" })).toBeNull();
  });

  it("hides the contact line when no access request email is configured", () => {
    open("/finance/engagement-app/dashboard");
    expect(screen.getByText("You don't have access to the Engagement App")).toBeInTheDocument();
    expect(screen.queryByText(/If you think you need access/)).toBeNull();
    expect(screen.queryByRole("link", { name: /@/ })).toBeNull();
  });

  it("still shows the app to someone with Finance access", async () => {
    state.info.data = user([1], [1, 2, 3]);
    open("/finance/engagement-app/dashboard");
    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(screen.queryByText("You don't have access to the Engagement App")).toBeNull();
  });

  it("lands an approver without the Dashboard on Approvals, on its first tab", async () => {
    state.info.data = user([26, 27]);
    open("/finance/engagement-app");
    expect(await screen.findByText("Approvals internal")).toBeInTheDocument();
    expect(where()).toBe("/finance/engagement-app/approvals/internal");
  });

  it("refuses Settings to an employee at its URL, not just in the rail", () => {
    open("/finance/engagement-app/settings/allocation-types");
    expect(screen.getByText("You don't have access to the Engagement App")).toBeInTheDocument();
    expect(screen.queryByText("Settings allocation-types")).toBeNull();
  });

  it("keeps today's redirect for a page the person lacks while they have other Finance access", () => {
    state.info.data = user([1], [1, 2, 3]);
    open("/finance/engagement-app/settings/allocation-types");
    expect(where()).toBe("/finance/engagement-app/dashboard");
  });

  it("opens Settings on a tab its privilege allows", async () => {
    state.info.data = user([1, 25]);
    open("/finance/engagement-app/settings/allocation-types");
    expect(await screen.findByText("Settings allocation-types")).toBeInTheDocument();
  });

  it("opens a travel request on its Travel Information tab, each tab with its own address", async () => {
    state.info.data = user([1], [1, 2, 3]);
    open("/finance/engagement-app/travel-requests/TRV-2026-10-1246");
    expect(where()).toBe("/finance/engagement-app/travel-requests/TRV-2026-10-1246/info");
    expect(await screen.findByText("Trip TRV-2026-10-1246 info finance")).toBeInTheDocument();
  });

  it("sends an unknown Engagement App address to the landing", () => {
    state.info.data = user([1], [1, 2, 3]);
    open("/finance/engagement-app/nowhere");
    expect(where()).toBe("/finance/engagement-app/dashboard");
  });
});

describe("the person's own pages under Me", () => {
  it("opens My Allocations for an employee", async () => {
    open("/me/allocations");
    expect(await screen.findByText("My allocations page")).toBeInTheDocument();
  });

  it("opens the person's own travel request under Me", async () => {
    open("/me/travel-requests/TRV-2026-10-1246");
    expect(await screen.findByText("Trip TRV-2026-10-1246 info me")).toBeInTheDocument();
  });

  it("shows no-access to a travel agent, who has no Me pages", () => {
    state.info.data = user([], [3, 18]);
    open("/me/allocations");
    expect(screen.getByText("Nothing here for you yet")).toBeInTheDocument();
  });
});
