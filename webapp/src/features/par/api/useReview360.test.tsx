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
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const authedGet = vi.fn();
vi.mock("@api/http", () => ({
  authedGet: (...args: unknown[]) => authedGet(...args),
  authedDelete: vi.fn(),
  authedPost: vi.fn(),
  authedPut: vi.fn(),
  defaultQueryRetry: false,
  HttpError: class extends Error {},
}));
vi.mock("@asgardeo/react", () => ({ useAsgardeo: () => ({ isSignedIn: true }) }));
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
vi.mock("@config/apiConfig", () => ({ parBackendUrl: "http://par", parServiceUrls: { parCycleForms: () => "/forms" } }));
vi.mock("@config/previewFeatures", () => ({ isPreviewEnabled: () => true }));
vi.mock("@features/my/util/digiopsHeaders", () => ({ digiopsHeaders: () => ({}) }));

const { useParShowsPar2 } = await import("./useReview360");

function render(client: QueryClient) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useParShowsPar2(7), { wrapper });
}

describe("useParShowsPar2", () => {
  it("says so when the cycle's forms can't be looked up", async () => {
    authedGet.mockRejectedValueOnce(new Error("Network error"));
    const { result } = render(new QueryClient());
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.showsPar2).toBe(false);
  });

  it("keeps the earlier answer when a refetch fails", async () => {
    const client = new QueryClient();
    client.setQueryData(["par-cycle-forms", 7], ["PEER_360"]);
    authedGet.mockRejectedValueOnce(new Error("Network error"));
    const { result } = render(client);
    await waitFor(() => expect(client.getQueryState(["par-cycle-forms", 7])?.status).toBe("error"));
    expect(result.current).toMatchObject({ showsPar2: true, error: null });
  });
});
