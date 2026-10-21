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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

// The Testing step's staging results must reflect the update's current state:
// the list fetched before Staging is empty, so it has to be fetched again once
// the update gets there, and again after any lifecycle transition.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@asgardeo/react", () => ({ useAsgardeo: () => ({ isSignedIn: true }) }));
vi.mock("@hooks/useAsgardeoSub", () => ({
  useAsgardeoSub: () => ({ state: { status: "ready", sub: "user-under-test" }, retry: () => {} }),
  foldIdentityError: (query: unknown) => query,
}));
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));

const authedGet = vi.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve([]));
const authedPut = vi.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve(null));
vi.mock("@api/http", async () => {
  const actual = await vi.importActual<typeof import("@api/http")>("@api/http");
  return {
    ...actual,
    authedGet: (...args: unknown[]) => authedGet(...args),
    authedPut: (...args: unknown[]) => authedPut(...args),
  };
});

// `@config/apiConfig` reads `window.config` at module load.
(window as unknown as { config: Record<string, string> }).config = {
  ONE_WSO2_UMT_BACKEND_URL: "https://umt.example.com",
};

const { useUmtStagingTestResults } = await import("../api/useUmtTesting");
const { useUmtLifecycleTransition } = await import("../api/useUmtLifecycleTransition");

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  authedGet.mockClear();
  authedPut.mockClear();
});

describe("staging test results", () => {
  it("are fetched again once the update reaches Staging", async () => {
    const { wrapper } = makeWrapper();
    const { rerender } = renderHook(({ state }) => useUmtStagingTestResults("42", state), {
      wrapper,
      initialProps: { state: "StagingRequested" },
    });
    await waitFor(() => expect(authedGet).toHaveBeenCalledTimes(1));

    rerender({ state: "Staging" });

    await waitFor(() => expect(authedGet).toHaveBeenCalledTimes(2));
  });

  it("are refreshed after a lifecycle transition", async () => {
    const { client, wrapper } = makeWrapper();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUmtLifecycleTransition("42"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("UATStaging");
    });

    expect(invalidate.mock.calls.map((call) => call[0]?.queryKey?.[0])).toContain("umt-update-staging-test-results");
  });
});
