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
import { renderHook } from "@testing-library/react";
import { swagStoreAccess } from "../../api/swagStoreAccess";
import type { SwagStoreMe } from "../../api/swagStoreTypes";
import { me } from "../../testing/fixtures";
import { SWAG_STORE_ADMIN_GROUP_ID, SWAG_STORE_ADMIN_SCREENS } from "../swagStoreAdminItems";
import {
  swagStoreAdminAllows,
  swagStoreAdminCanSee,
  swagStoreAdminVisibility,
  useSwagStoreAdminRailGate,
  type SwagStoreAdminRailGate,
} from "./useSwagStoreAdminGate";

// The rail hook's inputs: whether a backend URL is set, and the store's /users/me.
const state = {
  configured: true,
  me: { data: undefined as SwagStoreMe | undefined, isPending: false, isLoading: false, isError: false, error: null as unknown },
  refetch: vi.fn(),
};

vi.mock("@config/apiConfig", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@config/apiConfig")>()),
  isSwagStoreBackendConfigured: () => state.configured,
}));
vi.mock("../../api/useSwagStoreUserInfo", () => ({
  useSwagStoreUserInfo: () => ({ ...state.me, refetch: state.refetch }),
}));

beforeEach(() => {
  state.configured = true;
  state.me = { data: undefined, isPending: false, isLoading: false, isError: false, error: null };
  state.refetch.mockClear();
});

const catalog = swagStoreAccess(me({ roles: ["catalog_manager"] }));
const fulfilment = swagStoreAccess(me({ roles: ["fulfilment_ops"] }));
const both = swagStoreAccess(me({ roles: ["catalog_manager", "fulfilment_ops"] }));
const shopper = swagStoreAccess(me());

describe("swagStoreAdminCanSee", () => {
  it.each([
    [SWAG_STORE_ADMIN_GROUP_ID, true, true, false],
    [SWAG_STORE_ADMIN_SCREENS.dashboard.id, true, true, false],
  ])("%s: catalog %s, fulfilment %s, shopper %s", (id, forCatalog, forFulfilment, forShopper) => {
    expect(swagStoreAdminCanSee(id, catalog)).toBe(forCatalog);
    expect(swagStoreAdminCanSee(id, fulfilment)).toBe(forFulfilment);
    expect(swagStoreAdminCanSee(id, shopper)).toBe(forShopper);
    expect(swagStoreAdminCanSee(id, both)).toBe(true);
  });

  it("hides an id it doesn't know from everyone", () => {
    expect(swagStoreAdminCanSee("swag-store-admin-unknown", both)).toBe(false);
  });

  it("shows each screen's row to exactly the people its screens table entry names", () => {
    for (const screen of Object.values(SWAG_STORE_ADMIN_SCREENS)) {
      for (const access of [catalog, fulfilment, both, shopper]) {
        expect(swagStoreAdminCanSee(screen.id, access)).toBe(swagStoreAdminAllows(screen.need, access));
      }
    }
  });
});

describe("swagStoreAdminAllows", () => {
  it("lets each role through only to what it may use", () => {
    expect(swagStoreAdminAllows("ANY", catalog)).toBe(true);
    expect(swagStoreAdminAllows("ANY", shopper)).toBe(false);
    expect(swagStoreAdminAllows("CATALOG_MANAGER", fulfilment)).toBe(false);
    expect(swagStoreAdminAllows("FULFILMENT_OPS", fulfilment)).toBe(true);
  });
});

const rows = [SWAG_STORE_ADMIN_GROUP_ID, ...Object.values(SWAG_STORE_ADMIN_SCREENS).map((s) => s.id)];
const visible = (gate: SwagStoreAdminRailGate) => rows.filter((id) => gate.canSee(id));
const bothRoles = () => me({ roles: ["catalog_manager", "fulfilment_ops"] });

describe("useSwagStoreAdminRailGate", () => {
  it("passes a settled answer through: someone with both roles sees every row", () => {
    state.me.data = bothRoles();
    const { result } = renderHook(() => useSwagStoreAdminRailGate(true));
    expect(visible(result.current)).toEqual(rows);
    expect(result.current.isResolving).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("hides every row while the check is off, without calling it resolving or failed", () => {
    state.me = { ...state.me, data: bothRoles(), isPending: true };
    const { result } = renderHook(() => useSwagStoreAdminRailGate(false));
    expect(visible(result.current)).toEqual([]);
    expect(result.current.isResolving).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("hides every row while /users/me is in flight, so none flashes in", () => {
    state.me.isPending = true;
    const { result } = renderHook(() => useSwagStoreAdminRailGate(true));
    expect(result.current.isResolving).toBe(true);
    expect(visible(result.current)).toEqual([]);
  });

  it("a failed check hides every row, even with an earlier admin answer cached, and says why", () => {
    state.me = { ...state.me, data: bothRoles(), isError: true, error: new Error("gateway timeout") };
    const { result } = renderHook(() => useSwagStoreAdminRailGate(true));
    expect(visible(result.current)).toEqual([]);
    expect(result.current.isError).toBe(true);
    expect(result.current.errorMessage).toBe("gateway timeout");
    result.current.retry();
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });

  it("with no backend URL every row stays, and nothing is resolving or failed", () => {
    state.configured = false;
    state.me = { ...state.me, isPending: true, isError: true, error: new Error("unreachable") };
    const { result } = renderHook(() => useSwagStoreAdminRailGate(true));
    expect(visible(result.current)).toEqual(rows);
    expect(result.current.isResolving).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.errorMessage).toBeUndefined();
  });
});

describe("swagStoreAdminVisibility", () => {
  it("hands the rail a failed check's message and a retry that asks again", () => {
    state.me = { ...state.me, isError: true, error: new Error("gateway timeout") };
    const { result } = renderHook(() => useSwagStoreAdminRailGate(true));
    const answer = swagStoreAdminVisibility(result.current);
    expect(answer.error).toBe("gateway timeout");
    expect(answer.canSee(SWAG_STORE_ADMIN_GROUP_ID)).toBe(false);
    answer.retry();
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });

  it("has no error and a retry that does nothing when the check didn't fail", () => {
    state.me.data = bothRoles();
    const { result } = renderHook(() => useSwagStoreAdminRailGate(true));
    const answer = swagStoreAdminVisibility(result.current);
    expect(answer.error).toBeUndefined();
    expect(answer.resolving).toBe(false);
    expect(answer.canSee(SWAG_STORE_ADMIN_GROUP_ID)).toBe(true);
    answer.retry();
    expect(state.refetch).not.toHaveBeenCalled();
  });
});
