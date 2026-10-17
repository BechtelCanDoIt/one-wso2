// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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

// Screen-level checks for the Amplify pages. The gate and the data hooks are
// replaced with fixed answers so each test sets exactly the state it is about.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { AmplifyGate } from "../api/useAmplifyGate";
import type { AmplifyRole, Campaign, ConnectionStatus, TeamPageEntry } from "../api/amplifyTypes";

vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));
vi.mock("@config/apiConfig", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@config/apiConfig")>()),
  isAmplifyBackendConfigured: () => true,
}));

const gateState: { roles: AmplifyRole[]; status: ConnectionStatus } = { roles: [], status: "ACTIVE" };
function currentGate(): AmplifyGate {
  const { roles, status } = gateState;
  return {
    canSee: () => true,
    isAuthorized: true,
    isPo: roles.includes("amplify_po"),
    isMarketing: roles.includes("amplify_marketing"),
    isSlt: roles.includes("amplify_slt"),
    isAdmin: roles.includes("amplify_admin"),
    isResolving: false,
    isError: false,
    me: {
      employee: { employee_id: "e1", email: "a@wso2.com", display_name: "A" },
      roles,
      capabilities: [],
      linkedin: { status },
    },
    retry: vi.fn(),
  };
}
vi.mock("../api/useAmplifyGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/useAmplifyGate")>()),
  useAmplifyGate: () => currentGate(),
}));

// Every data hook answers from this table; tests overwrite what they need.
const ok = <T,>(data: T) => ({ data, isPending: false, isError: false, isFetching: false, error: null, refetch: vi.fn() });
const hookData: Record<string, unknown> = {};
vi.mock("../api/amplifyHooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/amplifyHooks")>();
  const from = (name: string) => () => hookData[name] ?? ok(undefined);
  return {
    ...actual,
    useAmplifyCampaigns: from("campaigns"),
    useAmplifyTags: from("tags"),
    useAmplifyCategories: from("categories"),
    useAmplifyTeam: from("team"),
    useAmplifyTeamHistory: from("teamHistory"),
    useAmplifyAdminSettings: from("adminSettings"),
    useAmplifyPointRules: from("pointRules"),
    useAmplifyPoDashboard: from("poDashboard"),
  };
});

const putAdminSettings = vi.fn();
vi.mock("../api/amplifyClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/amplifyClient")>()),
  putAdminSettings: (...args: unknown[]) => putAdminSettings(...args),
}));

const { default: AmplifyPostsPage, LINKEDIN_COMPOSE_URL } = await import("./AmplifyPostsPage");
const { default: AmplifyTeamPage } = await import("./AmplifyTeamPage");
const { default: AmplifyAdminSettingsTab } = await import("./AmplifyAdminSettingsTab");
const { default: AmplifyCampaignsPage } = await import("./AmplifyCampaignsPage");
const { default: AmplifyPoPointRulesTab } = await import("./AmplifyPoPointRulesTab");
const { default: AmplifyPoDashboardTab } = await import("./AmplifyPoDashboardTab");
const { default: CampaignFormDialog } = await import("../components/CampaignFormDialog");

function renderPage(ui: ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const campaign = (over: Partial<Campaign> = {}): Campaign => ({
  id: "c-1",
  provider: "linkedin",
  resourceUrn: "urn:li:share:1",
  resourceType: "SHARE",
  ownerUrn: "urn:li:organization:1",
  title: "Launch week",
  categoryCode: "PRODUCT",
  isPriority: false,
  tags: [],
  opensAt: "2026-10-10T00:00:00Z",
  closesAt: "2026-11-10T00:00:00Z",
  status: "OPEN",
  createdBy: "m",
  createdAt: "2026-10-10T00:00:00Z",
  updatedAt: "2026-10-10T00:00:00Z",
  version: 1,
  ...over,
});

beforeEach(() => {
  for (const k of Object.keys(hookData)) delete hookData[k];
  gateState.roles = [];
  gateState.status = "ACTIVE";
  putAdminSettings.mockReset();
});

describe("Posts", () => {
  it("“Make a post” opens LinkedIn compose in a new tab", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    hookData.campaigns = ok({ items: [], page: 0, size: 9, total: 0 });
    renderPage(<AmplifyPostsPage />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Make a post" }));
    expect(open).toHaveBeenCalledWith(LINKEDIN_COMPOSE_URL, "_blank", "noopener,noreferrer");
    expect(LINKEDIN_COMPOSE_URL).toBe("https://www.linkedin.com/feed/?shareActive=true");
    // Not a "blocked" complaint: with noopener the null return means nothing.
    expect(screen.queryByText(/blocked/)).toBeNull();
    open.mockRestore();
  });

  it.each(["EXPIRING", "NEEDS_RECONNECT"] as const)("shows a reconnect banner for %s", (status) => {
    gateState.status = status;
    hookData.campaigns = ok({ items: [], page: 0, size: 9, total: 0 });
    renderPage(<AmplifyPostsPage />);
    expect(screen.getByRole("link", { name: "Reconnect" })).toHaveAttribute("href", "/settings/connections");
  });

  it("does not render a non-http(s) campaign image", () => {
    hookData.campaigns = ok({
      items: [campaign({ imageUrl: "javascript:alert(1)" }), campaign({ id: "c-2", imageUrl: "https://cdn.wso2.com/a.png" })],
      page: 0,
      size: 9,
      total: 2,
    });
    const { container } = renderPage(<AmplifyPostsPage />);
    const srcs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
    expect(srcs).toEqual(["https://cdn.wso2.com/a.png"]);
  });
});

describe("Team actions follow entry.actions, not the role", () => {
  const entry = (over: Partial<TeamPageEntry>): TeamPageEntry => ({
    employeeId: "e-x",
    displayName: "X",
    email: "x@wso2.com",
    points: 10,
    rank: 1,
    teamRank: 1,
    actions: { canAdjust: false, canReverse: false },
    ...over,
  });

  it("offers Adjust only on rows the backend says may be adjusted", () => {
    // A PO role on the caller does not open a row the backend closed.
    gateState.roles = ["amplify_po"];
    hookData.team = ok({
      period: "ALL",
      scope: "COMPANY",
      page: 0,
      size: 25,
      total: 2,
      teamStatus: "OK",
      summary: { headcount: null, activeCount: 2 },
      entries: [
        entry({ employeeId: "e-1", displayName: "Open Row", actions: { canAdjust: true, canReverse: true } }),
        entry({ employeeId: "e-2", displayName: "Closed Row" }),
      ],
    });
    renderPage(<AmplifyTeamPage />);
    const rows = screen.getAllByRole("row");
    const open = rows.find((r) => within(r).queryByText("Open Row"))!;
    const closed = rows.find((r) => within(r).queryByText("Closed Row"))!;
    expect(within(open).getByRole("button", { name: "Adjust" })).toBeInTheDocument();
    expect(within(closed).queryByRole("button", { name: "Adjust" })).toBeNull();
  });

  it("offers Reverse on ledger rows only when canReverse, and never on a reversal", async () => {
    hookData.team = ok({
      period: "ALL",
      scope: "TEAM",
      page: 0,
      size: 25,
      total: 1,
      teamStatus: "OK",
      summary: { headcount: 1, activeCount: 1 },
      entries: [entry({ employeeId: "e-1", displayName: "Row", actions: { canAdjust: true, canReverse: true } })],
    });
    hookData.teamHistory = ok({
      employeeId: "e-1",
      page: 0,
      size: 25,
      total: 2,
      items: [
        { reference: "r1", employeeId: "e-1", sourceType: "ENGAGEMENT", action: "REPOST", points: 5, actorId: "s", createdAt: "2026-10-01T00:00:00Z" },
        { reference: "r2", employeeId: "e-1", sourceType: "REVERSAL", points: -5, actorId: "p", createdAt: "2026-10-02T00:00:00Z", reversesReference: "r1" },
      ],
    });
    renderPage(<AmplifyTeamPage />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Expand" }));
    expect(await screen.findAllByRole("button", { name: "Reverse" })).toHaveLength(1);
  });
});

describe("Admin settings", () => {
  const at = "2026-10-17T00:00:00Z";
  const settings = [
    { key: "leaderboard.top_n", value: 3, version: 4, updatedBy: "a", updatedAt: at },
    { key: "run.schedule", value: "@every 5m", version: 2, updatedBy: "a", updatedAt: at },
    { key: "connection.reminder_days", value: 7, version: 1, updatedBy: "a", updatedAt: at },
    { key: "campaign.default_window_days", value: 30, version: 1, updatedBy: "a", updatedAt: at },
  ];

  it("PUTs only the changed key, as a JSON number, with its read version", async () => {
    putAdminSettings.mockResolvedValue({ settings });
    hookData.adminSettings = ok({ settings });
    const user = userEvent.setup();
    renderPage(<AmplifyAdminSettingsTab />);
    const topN = await screen.findByRole("spinbutton", { name: "Leaderboard top N" });
    await user.clear(topN);
    await user.type(topN, "5");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(putAdminSettings).toHaveBeenCalledWith(
      "token",
      { changes: [{ key: "leaderboard.top_n", value: 5, version: 4 }] },
      expect.any(String),
    );
  });

  it("refuses an out-of-range int instead of sending it", async () => {
    hookData.adminSettings = ok({ settings });
    const user = userEvent.setup();
    renderPage(<AmplifyAdminSettingsTab />);
    const topN = await screen.findByRole("spinbutton", { name: "Leaderboard top N" });
    await user.clear(topN);
    await user.type(topN, "99");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/between 1 and 50/)).toBeInTheDocument();
    expect(putAdminSettings).not.toHaveBeenCalled();
  });
});

describe("Campaigns", () => {
  it("is open to the PO role as well as Marketing (A6)", () => {
    gateState.roles = ["amplify_po"];
    hookData.campaigns = ok({ items: [], page: 0, size: 25, total: 0 });
    renderPage(<AmplifyCampaignsPage />);
    expect(screen.getByRole("button", { name: "New campaign" })).toBeInTheDocument();
    expect(screen.queryByText(/This screen is for/)).toBeNull();
  });

  it("tells a caller with neither role which roles it needs", () => {
    gateState.roles = ["amplify_admin"];
    renderPage(<AmplifyCampaignsPage />);
    expect(screen.getByText(/Marketing or PO role/)).toBeInTheDocument();
  });

  it("defaults a new campaign to close 30 days after it opens, and the close follows the open", async () => {
    hookData.categories = ok({ categories: [] });
    renderPage(<CampaignFormDialog open onClose={() => {}} />);
    const opens = screen.getByLabelText("Opens") as HTMLInputElement;
    const closes = screen.getByLabelText("Closes") as HTMLInputElement;
    const diffDays = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
    expect(diffDays(opens.value, closes.value)).toBe(30);

    const user = userEvent.setup();
    await user.clear(opens);
    await user.type(opens, "2026-12-01T10:00");
    await waitFor(() => expect(closes.value).toBe("2026-12-31T10:00"));
  });
});

describe("PO tabs read the contract's shapes", () => {
  it("lists point rules from `rules` (not `items`)", () => {
    hookData.pointRules = ok({
      rules: [
        { id: "r1", action: "REPOST", points: 5, effectiveFrom: "2026-01-01T00:00:00Z", createdBy: "p", createdAt: "2026-01-01T00:00:00Z", inForce: true },
      ],
    });
    renderPage(<AmplifyPoPointRulesTab />);
    expect(screen.getByText("In force")).toBeInTheDocument();
    expect(screen.queryByText("No point rules defined.")).toBeNull();
  });

  it("reads shareHealth.failedByReason as a map and shows only the reasons that failed", () => {
    hookData.poDashboard = ok({
      asOf: "2026-10-17T00:00:00Z",
      month: "2026-10",
      reviewQueue: { pending: 0, oldestPendingAt: null, overSla: 0, slaHours: 48 },
      reviewThroughput: { windowDays: 30, approved: 0, rejected: 0, amplified: 0, medianHoursToDecision: null },
      actionRequired: { count: 0 },
      points: { monthTotal: 0, allTimeTotal: 0, byAction: [] },
      participation: { connections: { active: 0, expiring: 0, needsReconnect: 0 }, employeesWithPoints: 0, activeLast30Days: 0 },
      campaigns: [],
      shareHealth: {
        windowDays: 7,
        queued: 0,
        published: 0,
        failed: 3,
        failedByReason: { NEEDS_RECONNECT: 2, PROVIDER_REJECTED: 0, RETRIES_EXHAUSTED: 1 },
      },
      recentCorrections: [],
    });
    renderPage(<AmplifyPoDashboardTab />);
    expect(screen.getByText("NEEDS_RECONNECT: 2")).toBeInTheDocument();
    expect(screen.getByText("RETRIES_EXHAUSTED: 1")).toBeInTheDocument();
    expect(screen.queryByText(/PROVIDER_REJECTED/)).toBeNull();
  });
});
