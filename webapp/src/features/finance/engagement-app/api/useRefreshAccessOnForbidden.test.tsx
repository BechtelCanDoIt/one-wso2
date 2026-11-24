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
import type { UserInfo } from "./engagementTypes";

vi.mock("@components/side-rail/usePerspectiveVisibility", () => ({
  usePerspectiveVisibility: () => ({ resolveVisible: () => true, isResolving: false, visibleLeaves: [], isError: false, retry: () => {} }),
}));
vi.mock("@config/apiConfig", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@config/apiConfig")>()),
  isEngagementAppBackendConfigured: () => true,
}));
vi.mock("./engagementBasis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./engagementBasis")>()),
  useEngagementBasis: () => ({
    getToken: async () => "token",
    sub: "me",
    subState: { status: "ready", sub: "me" },
    retryIdentity: () => {},
    ready: true,
    key: (...parts: readonly unknown[]) => ["engagement-app", "me", ...parts],
  }),
}));
const http = vi.hoisted(() => ({ calls: [] as string[], userInfos: [] as unknown[], approvalsForbidden: true }));
vi.mock("@api/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@api/http")>();
  return {
    ...actual,
    authedGet: async (url: string) => {
      http.calls.push(url);
      if (url.includes("user-info")) return http.userInfos[Math.min(http.calls.filter((c) => c.includes("user-info")).length - 1, http.userInfos.length - 1)];
      throw new actual.HttpError(url, 403, JSON.stringify({ message: "You do not have permission to perform this action." }));
    },
  };
});
vi.mock("../approvals/ApprovalsPage", () => ({
  default: function Approvals() {
    const q = useApprovals("internal");
    return q.isError ? <p>Couldn&apos;t load the approvals. {q.error.message}</p> : <h1>Approvals page</h1>;
  },
  ApprovalsIndex: () => null,
}));

import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MutationObserver, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes } from "react-router";
import { HttpError } from "@api/http";
import { ENGAGEMENT_ITEM } from "@constants/engagementApps";
import { engagementRoutes } from "../routes";
import { useApprovals } from "./useEngagementApi";
import { useEngagementUserInfo } from "./useEngagementUserInfo";
import { useEngagementRailGate } from "./useEngagementRailGate";
import { useRefreshAccessOnForbidden } from "./useRefreshAccessOnForbidden";

const approver: UserInfo = { email: "a@wso2.com", allocations: { privileges: [1, 26, 27] }, travel: { privileges: [49] } };
const employee: UserInfo = { email: "a@wso2.com", allocations: { privileges: [1] }, travel: { privileges: [49] } };

const userInfoCalls = () => http.calls.filter((c) => c.includes("user-info")).length;
const approvalsCalls = () => http.calls.filter((c) => !c.includes("user-info")).length;

function Rail() {
  const gate = useEngagementRailGate(true);
  return <p data-testid="rail">{gate.canSee(ENGAGEMENT_ITEM.approvals) ? "Approvals shown" : "Approvals hidden"}</p>;
}

function open(at: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[at]}>
        <Rail />
        <Routes>{engagementRoutes}</Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  http.calls = [];
  http.userInfos = [approver];
});

describe("refreshing access when the backend answers 403", () => {
  it("refetches /user-info, then replaces the error with the no-access page and drops the rail item", async () => {
    http.userInfos = [approver, employee];
    open("/finance/engagement-app/approvals/internal");
    await waitFor(() => expect(screen.getByTestId("rail")).toHaveTextContent("Approvals shown"));
    expect(await screen.findByText("You don't have access to the Engagement App")).toBeInTheDocument();
    expect(userInfoCalls()).toBe(2);
    expect(screen.queryByText(/Couldn't load the approvals/)).toBeNull();
    expect(screen.getByTestId("rail")).toHaveTextContent("Approvals hidden");
  });

  it("keeps the error when the fresh privileges still allow the page, and does not loop", async () => {
    http.userInfos = [approver, approver];
    open("/finance/engagement-app/approvals/internal");
    expect(await screen.findByText(/Couldn't load the approvals/)).toBeInTheDocument();
    await waitFor(() => expect(userInfoCalls()).toBe(2));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(userInfoCalls()).toBe(2);
    expect(approvalsCalls()).toBe(1);
    expect(screen.getByTestId("rail")).toHaveTextContent("Approvals shown");
  });

  it("refetches once for a burst of 403s, and not for a 403 from /user-info itself", async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    renderHook(() => ({ info: useEngagementUserInfo(), refresh: useRefreshAccessOnForbidden() }), { wrapper });
    await waitFor(() => expect(userInfoCalls()).toBe(1));
    const forbidden = (name: string) =>
      client.fetchQuery({ queryKey: ["engagement-app", "me", name], retry: false, queryFn: () => Promise.reject(new HttpError(name, 403, "")) }).catch(() => undefined);
    await act(async () => {
      await Promise.all([forbidden("a"), forbidden("b"), forbidden("c")]);
    });
    await waitFor(() => expect(userInfoCalls()).toBe(2));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(userInfoCalls()).toBe(2);
  });

  it("does not refresh for other statuses", async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    renderHook(() => ({ info: useEngagementUserInfo(), refresh: useRefreshAccessOnForbidden() }), { wrapper });
    await waitFor(() => expect(userInfoCalls()).toBe(1));
    await client.fetchQuery({ queryKey: ["engagement-app", "me", "x"], retry: false, queryFn: () => Promise.reject(new HttpError("x", 500, "")) }).catch(() => undefined);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(userInfoCalls()).toBe(1);
  });

  it("also refreshes when an Engagement App write answers 403", async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    renderHook(() => ({ info: useEngagementUserInfo(), refresh: useRefreshAccessOnForbidden() }), { wrapper });
    await waitFor(() => expect(userInfoCalls()).toBe(1));
    const write = new MutationObserver(client, {
      mutationKey: ["engagement-app", "mutation"],
      mutationFn: () => Promise.reject(new HttpError("w", 403, "")),
    });
    await write.mutate().catch(() => undefined);
    await waitFor(() => expect(userInfoCalls()).toBe(2));
  });
});
