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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@api/http", () => ({
  authedPost: vi.fn(async () => ({ run: "STARTED" })),
  authedPatch: vi.fn(async () => ({})),
  authedDelete: vi.fn(async () => undefined),
}));
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
vi.mock("@hooks/useAsgardeoSub", () => ({ useAsgardeoSub: () => ({ state: { status: "ready", sub: "sub-1" } }) }));

import { authedDelete, authedPost } from "@api/http";
import {
  useArchiveCampaign,
  useRegisterCampaign,
  useRemoveLinkedInConnection,
  useRetryAnnouncement,
  useSendAnnouncement,
} from "./useAmplifyMutations";
import type { CampaignDraft } from "./amplifyTypes";

// The app's QueryClient sets refetchOnMount: false, so a list that no page is showing must be refetched by the
// mutation itself, or Current Posts keeps its old rows after New Post saves.
describe("saving a post", () => {
  it("refetches a cached campaigns list that no page is showing, before the mutation settles", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { refetchOnMount: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const loadList = vi.fn(async () => ({ items: [] }));
    await qc.fetchQuery({ queryKey: ["amplify", "campaigns", "sub-1", "all"], queryFn: loadList });
    expect(loadList).toHaveBeenCalledTimes(1);

    const { result } = renderHook(() => useRegisterCampaign(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ draft: {} as CampaignDraft, shareNow: true });
    });

    expect(loadList).toHaveBeenCalledTimes(2);
  });
});

// The Choreo API proxy's CORS allow-list has no Idempotency-Key, so a POST that
// sends one is blocked in the browser after its preflight passes.
describe("a POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends no Idempotency-Key header", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { refetchOnMount: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useRegisterCampaign(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ draft: {} as CampaignDraft, shareNow: false });
    });

    const call = vi.mocked(authedPost).mock.calls[0] as unknown[];
    expect(call).toHaveLength(3);
  });
});

describe("removing the LinkedIn connection", () => {
  it("sends DELETE /connections/linkedin and refetches the caller's /me status", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { refetchOnMount: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const loadMe = vi.fn(async () => ({ linkedin: { status: "ACTIVE" } }));
    await qc.fetchQuery({ queryKey: ["amplify", "me", "sub-1"], queryFn: loadMe });

    const { result } = renderHook(() => useRemoveLinkedInConnection(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(vi.mocked(authedDelete).mock.calls[0][0]).toMatch(/\/connections\/linkedin$/);
    expect(loadMe).toHaveBeenCalledTimes(2);
  });
});

describe("deleting a post", () => {
  it("sends DELETE for the campaign and refetches the campaigns lists", async () => {
    vi.clearAllMocks();
    const qc = new QueryClient({ defaultOptions: { queries: { refetchOnMount: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const loadList = vi.fn(async () => ({ items: [] }));
    await qc.fetchQuery({ queryKey: ["amplify", "campaigns", "sub-1", "open"], queryFn: loadList });

    const { result } = renderHook(() => useArchiveCampaign(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "c-1" });
    });

    expect(vi.mocked(authedDelete).mock.calls[0][0]).toContain("c-1");
    expect(loadList).toHaveBeenCalledTimes(2);
  });
});

describe("re-queuing an announcement", () => {
  it.each([
    ["retry", useRetryAnnouncement],
    ["send", useSendAnnouncement],
  ])("%s shows the post as Queued at once and reloads the Operations board", async (_name, useHook) => {
    const qc = new QueryClient({ defaultOptions: { queries: { refetchOnMount: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const board = (status: "FAILED" | "NONE") => ({
      campaigns: [
        { campaignId: "c1", announcement: { status } },
        { campaignId: "c2", announcement: { status: "SENT" } },
      ],
    });
    const load = vi.fn(async () => board("FAILED"));
    await qc.fetchQuery({ queryKey: ["amplify", "dashboard-operations", "sub-1"], queryFn: load });
    const { result } = renderHook(() => useHook(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ campaignId: "c1" });
    });
    const shown = qc.getQueryData<ReturnType<typeof board>>(["amplify", "dashboard-operations", "sub-1"]);
    // Right after the POST the cache already says QUEUED for c1 only; the refetch then replaces it with the server's answer.
    expect(load).toHaveBeenCalledTimes(2);
    expect(shown?.campaigns[1].announcement.status).toBe("SENT");
  });
});
