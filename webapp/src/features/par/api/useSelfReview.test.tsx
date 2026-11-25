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
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { SelfReview } from "./selfReviewTypes";

const authedPut = vi.fn(async () => undefined);
const authedGet = vi.fn();
vi.mock("@api/http", () => ({
  authedGet: (...args: unknown[]) => authedGet(...args),
  authedPut: () => authedPut(),
  authedPost: vi.fn(),
  defaultQueryRetry: false,
  HttpError: class extends Error {},
}));
vi.mock("@asgardeo/react", () => ({ useAsgardeo: () => ({ isSignedIn: true }) }));
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
vi.mock("@config/apiConfig", () => ({ parBackendUrl: "http://par", parServiceUrls: { parSelfReview: () => "/self-review" } }));
vi.mock("@features/my/util/digiopsHeaders", () => ({ digiopsHeaders: () => ({}) }));

const { useSaveSelfReview, useSelfReview } = await import("./useSelfReview");

describe("useSaveSelfReview", () => {
  it("keeps the cached self-review in step with what was saved, so coming back shows the draft", async () => {
    const client = new QueryClient();
    const key = ["par-self-review", 2, "me@wso2.com"];
    client.setQueryData<SelfReview>(key, { answers: {}, employeeStatus: "PENDING" } as SelfReview);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSaveSelfReview(2, "me@wso2.com"), { wrapper });

    act(() => result.current.mutate({ impact: "Shipped it" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData<SelfReview>(key)?.answers).toEqual({ impact: "Shipped it" });
  });

  it("doesn't let a read still in flight put older answers back over what was just saved", async () => {
    const client = new QueryClient();
    const key = ["par-self-review", 2, "me@wso2.com"];
    client.setQueryData<SelfReview>(key, { answers: { impact: "Old" }, employeeStatus: "DRAFT" } as Partial<SelfReview> as SelfReview);
    let finishRead: (review: SelfReview) => void = () => {};
    authedGet.mockImplementationOnce(() => new Promise<SelfReview>((resolve) => (finishRead = resolve)));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => ({ read: useSelfReview(2, "me@wso2.com"), save: useSaveSelfReview(2, "me@wso2.com") }),
      { wrapper },
    );
    await waitFor(() => expect(authedGet).toHaveBeenCalled());

    act(() => result.current.save.mutate({ impact: "New" }));
    await waitFor(() => expect(result.current.save.isSuccess).toBe(true));
    await act(async () => finishRead({ answers: { impact: "Old" }, employeeStatus: "DRAFT" } as Partial<SelfReview> as SelfReview));
    expect(client.getQueryData<SelfReview>(key)?.answers).toEqual({ impact: "New" });
  });
});
