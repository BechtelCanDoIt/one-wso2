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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { ENGAGEMENT_GROUP_ID, ENGAGEMENT_ITEM, ENGAGEMENT_ITEM_IDS } from "@constants/engagementApps";
import { FINANCE_ITEM_IDS } from "@constants/financeApps";
import { claimOf, claimsForPerspective } from "@components/side-rail/visibilityFold";
import type { UserInfo } from "./engagementTypes";
import { engagementVisibility, useEngagementRailGate } from "./useEngagementRailGate";

// Hoisted: the perspective rows read the connected check while their module loads.
const state = vi.hoisted(() => ({
  configured: true,
  info: { data: undefined as UserInfo | undefined, isPending: false, isLoading: false, isError: false, error: null as unknown },
}));

vi.mock("@config/apiConfig", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@config/apiConfig")>()),
  isEngagementAppBackendConfigured: () => state.configured,
}));
vi.mock("./useEngagementUserInfo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./useEngagementUserInfo")>()),
  useEngagementUserInfo: () => ({ ...state.info, refetch: vi.fn() }),
}));

const user = (allocations: number[], travel: number[] = []): UserInfo => ({
  email: "jane@wso2.com",
  allocations: { privileges: allocations },
  travel: { privileges: travel },
});

const visible = (gate: ReturnType<typeof useEngagementRailGate>) => [...ENGAGEMENT_ITEM_IDS].filter((id) => gate.canSee(id));

beforeEach(() => {
  state.configured = true;
  state.info = { data: undefined, isPending: false, isLoading: false, isError: false, error: null };
});

describe("which Engagement App rows a person sees", () => {
  it("an employee sees only their own pages under Me, no Engagement App under Finance", () => {
    state.info.data = user([1], [19, 20, 21, 23, 24, 36, 49]);
    const { result } = renderHook(() => useEngagementRailGate(true));
    expect(visible(result.current)).toEqual([
      ENGAGEMENT_ITEM.myAllocations,
      ENGAGEMENT_ITEM.myTravelRequests,
      ENGAGEMENT_ITEM.myDocuments,
    ]);
  });

  it("a travel agent sees Dashboard and Travel Requests, and no Me rows", () => {
    state.info.data = user([], [3, 4, 6, 18, 26, 28, 30, 31]);
    const { result } = renderHook(() => useEngagementRailGate(true));
    expect(visible(result.current)).toEqual([ENGAGEMENT_GROUP_ID, ENGAGEMENT_ITEM.dashboard, ENGAGEMENT_ITEM.travelRequests]);
  });

  it("a travel finance approver sees Travel Requests, Invoices & Payments, Reports and Visas & Documents", () => {
    state.info.data = user([1, 3, 6, 8, 9, 13, 18, 19, 22], [2, 3, 8, 28, 30, 33, 34, 35, 39, 40, 41, 42, 43, 44, 45]);
    const { result } = renderHook(() => useEngagementRailGate(true));
    expect(visible(result.current)).toEqual(
      expect.arrayContaining([ENGAGEMENT_ITEM.travelRequests, ENGAGEMENT_ITEM.invoices, ENGAGEMENT_ITEM.reports, ENGAGEMENT_ITEM.visas]),
    );
    expect(visible(result.current)).not.toContain(ENGAGEMENT_ITEM.settings);
  });

  it("someone with no privileges sees no Engagement App group at all", () => {
    state.info.data = user([], []);
    const { result } = renderHook(() => useEngagementRailGate(true));
    expect(visible(result.current)).toEqual([]);
  });

  it("nothing shows while /user-info is in flight, so no row flashes in and out", () => {
    state.info.isPending = true;
    const { result } = renderHook(() => useEngagementRailGate(true));
    expect(result.current.isResolving).toBe(true);
    expect(visible(result.current)).toEqual([]);
  });

  it("a failed check hides the rows and is folded into not allowed, so Finance and Me still open", () => {
    state.info.isError = true;
    state.info.error = new Error("gateway timeout");
    const { result } = renderHook(() => useEngagementRailGate(true));
    expect(result.current.isError).toBe(true);
    expect(visible(result.current)).toEqual([]);
    expect(engagementVisibility(result.current).error).toBeUndefined();
  });

  it("with no backend URL every row stays, and each page says what is missing", () => {
    state.configured = false;
    const { result } = renderHook(() => useEngagementRailGate(true));
    expect(visible(result.current)).toEqual([...ENGAGEMENT_ITEM_IDS]);
  });

  it("fails closed on an id it has no case for", () => {
    state.info.data = user([1, 2, 3], [1, 2]);
    const { result } = renderHook(() => useEngagementRailGate(true));
    expect(result.current.canSee("finance-ea-something-new")).toBe(false);
  });
});

describe("the engagement adapter", () => {
  const original = window.config;
  afterEach(() => {
    window.config = original;
  });

  it("claims every Engagement App row, and none of the finance gate's", () => {
    const claim = claimOf("engagement");
    expect(claim.kind).toBe("sections");
    if (claim.kind !== "sections") return;
    expect([...claim.ids].sort()).toEqual([...ENGAGEMENT_ITEM_IDS].sort());
    expect([...claim.ids].filter((id) => FINANCE_ITEM_IDS.has(id))).toEqual([]);
  });

  it("is in play under Finance and Me only while the backend URL is set", () => {
    expect(claimsForPerspective("finance")).toContain("engagement");
    expect(claimsForPerspective("me")).toContain("engagement");
    expect(claimsForPerspective("sales")).not.toContain("engagement");
    state.configured = false;
    expect(claimsForPerspective("finance")).not.toContain("engagement");
  });
});
