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
import { useRegisterCampaign, useRemoveLinkedInConnection } from "./useAmplifyMutations";
import type { CampaignDraft } from "./amplifyTypes";

const keyOf = (call: unknown[]): string => (call[3] as Record<string, string>)["Idempotency-Key"];

function deferred() {
  let resolve: (value: unknown) => void = () => {};
  const promise = new Promise((r) => {
    resolve = r as (value: unknown) => void;
  });
  return { promise, resolve };
}

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

// A double click reaches mutate() twice before React re-renders the disabled
// button. Both calls must carry one key, or amplify-api records two posts; a
// submit after the attempt settles is a new action and gets a new key.
describe("the Idempotency-Key", () => {
  const draft = {} as CampaignDraft;

  // Call history carries across tests otherwise, and these assert on calls[0].
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    const qc = new QueryClient({ defaultOptions: { queries: { refetchOnMount: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    return renderHook(() => useRegisterCampaign(), { wrapper });
  }

  it("is shared by two submits that overlap, so the second is a replay", async () => {
    const post = deferred();
    vi.mocked(authedPost).mockImplementation(() => post.promise as never);
    const { result } = setup();

    let first: Promise<unknown>;
    let second: Promise<unknown>;
    await act(async () => {
      first = result.current.mutateAsync({ draft, shareNow: false });
      second = result.current.mutateAsync({ draft, shareNow: false });
      post.resolve({ run: "STARTED" });
      await Promise.all([first, second]);
    });

    const calls = vi.mocked(authedPost).mock.calls;
    expect(calls).toHaveLength(2);
    expect(keyOf(calls[0])).toBe(keyOf(calls[1]));
  });

  it("is new once the attempt has settled, because that is a new action", async () => {
    vi.mocked(authedPost).mockImplementation(async () => ({ run: "STARTED" }) as never);
    const { result } = setup();

    await act(async () => {
      await result.current.mutateAsync({ draft, shareNow: false });
      await result.current.mutateAsync({ draft, shareNow: false });
    });

    const calls = vi.mocked(authedPost).mock.calls;
    expect(calls).toHaveLength(2);
    expect(keyOf(calls[0])).not.toBe(keyOf(calls[1]));
  });

  it("is released after a failure too, so a retry is not answered from the failed attempt", async () => {
    vi.mocked(authedPost).mockRejectedValueOnce(new Error("502"));
    const { result } = setup();

    await act(async () => {
      await expect(result.current.mutateAsync({ draft, shareNow: false })).rejects.toThrow("502");
    });
    vi.mocked(authedPost).mockImplementation(async () => ({ run: "STARTED" }) as never);
    await act(async () => {
      await result.current.mutateAsync({ draft, shareNow: false });
    });

    const calls = vi.mocked(authedPost).mock.calls;
    expect(calls).toHaveLength(2);
    expect(keyOf(calls[0])).not.toBe(keyOf(calls[1]));
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
