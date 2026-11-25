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
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.hoisted(() => vi.fn());
vi.mock("@api/http", async (orig) => ({ ...(await orig<object>()), authedGet: get }));
vi.mock("./engagementBasis", () => ({
  useEngagementBasis: () => ({
    getToken: () => Promise.resolve("t"),
    ready: true,
    sub: "sub-1",
    subState: { status: "ready", sub: "sub-1" },
    retryIdentity: () => undefined,
    key: (...parts: unknown[]) => ["engagement-app", "sub-1", ...parts],
  }),
}));

import { useDashboardCatalogue } from "./useEngagementApi";
import { writeSessionCache } from "./sessionCache";

// The app's own client never refetches on mount, so the copy kept for a reload would have stayed forever.
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { refetchOnMount: false, retry: false } } })}>{children}</QueryClientProvider>
);

describe("a reload's copy of the widget list", () => {
  beforeEach(() => {
    sessionStorage.clear();
    get.mockReset();
  });

  it("is on screen at once, then replaced by the backend's answer, date included", async () => {
    writeSessionCache("dashboard-catalogue", "sub-1", { widgets: [{ id: "waiting-on-you", defaultOn: true }], failedSections: [] });
    get.mockResolvedValue({ date: "2026-11-24", widgets: [{ id: "tc-kpis", defaultOn: true }], failedSections: [] });
    const { result } = renderHook(() => useDashboardCatalogue(), { wrapper });
    expect(result.current.data?.widgets?.[0]?.id).toBe("waiting-on-you");
    expect(result.current.data?.date).toBeUndefined();
    await waitFor(() => expect(result.current.data?.date).toBe("2026-11-24"));
    expect(result.current.data?.widgets?.map((w) => w.id)).toEqual(["tc-kpis"]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("keeps nothing of an empty list (a travel agent's answer has none)", async () => {
    get.mockResolvedValue({ date: "2026-11-24", widgets: [], failedSections: [] });
    const { result } = renderHook(() => useDashboardCatalogue(), { wrapper });
    await waitFor(() => expect(result.current.data?.date).toBe("2026-11-24"));
    expect(sessionStorage.getItem("ea.cache.v1.dashboard-catalogue")).toBeNull();
  });
});
