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

// The rail's view of the Swag Store admin screens, beside the other rail
// gates. Nothing here is access control: the backend re-checks every call.

import type { VisibilityAnswer } from "@components/side-rail/visibilityFold";
import { describeError } from "@api/errors";
import { isSwagStoreBackendConfigured } from "@config/apiConfig";
import { swagStoreAccess, type SwagStoreAccess } from "../../api/swagStoreAccess";
import { useSwagStoreUserInfo } from "../../api/useSwagStoreUserInfo";
import { SWAG_STORE_ADMIN_GROUP_ID, SWAG_STORE_ADMIN_SCREENS, type SwagStoreAdminNeed } from "../swagStoreAdminItems";

/** Whether an access answer lets a person use a screen that needs `need`. */
export function swagStoreAdminAllows(need: SwagStoreAdminNeed, access: SwagStoreAccess): boolean {
  switch (need) {
    case "CATALOG_MANAGER":
      return access.isCatalogManager;
    case "FULFILMENT_OPS":
      return access.isFulfilmentOps;
    case "ANY":
      return access.isAdmin;
  }
}

/** Which rail rows an access answer opens. The group shows when any of its rows does. */
export function swagStoreAdminCanSee(itemId: string, access: SwagStoreAccess): boolean {
  if (itemId === SWAG_STORE_ADMIN_GROUP_ID) return access.isAdmin;
  const screen = Object.values(SWAG_STORE_ADMIN_SCREENS).find((s) => s.id === itemId);
  // Fail closed: an admin id the screens table doesn't list is hidden from everyone.
  return screen ? swagStoreAdminAllows(screen.need, access) : false;
}

/** The rail's answer for the Swag Store admin rows. */
export interface SwagStoreAdminRailGate {
  /**
   * Whether a row shows. False for every row while the check is off (another
   * perspective is open, or the store is switched off), still running, or
   * failed. True for every row when no backend URL is configured.
   */
  canSee: (itemId: string) => boolean;
  /** The store's /users/me is in flight. Never true while the check is off or unconfigured. */
  isResolving: boolean;
  /** The access check itself failed; reported as "couldn't check", never as "no access". */
  isError: boolean;
  /** Why the check failed, for the rail to show. Set only when `isError` is. */
  errorMessage: string | undefined;
  /** Asks the store's /users/me again. */
  retry: () => void;
}

/**
 * Hidden while the store's /users/me is in flight, so rows never flash in for
 * someone without a role, and when the check failed (failing closed, reported
 * through isError). With no backend URL every row stays: there is nothing to
 * ask, and each page explains what is missing.
 *
 * @param enabled - Whether People Ops is the open perspective and the store is switched on
 */
export function useSwagStoreAdminRailGate(enabled: boolean): SwagStoreAdminRailGate {
  const me = useSwagStoreUserInfo(enabled);
  const configured = isSwagStoreBackendConfigured();
  const active = enabled && configured;
  const isResolving = active && (me.isPending || me.isLoading);
  const failed = active && me.isError;
  const access = swagStoreAccess(me.data);
  return {
    canSee: (itemId) => {
      if (!configured) return true;
      if (!active || isResolving || failed) return false;
      return swagStoreAdminCanSee(itemId, access);
    },
    isResolving,
    isError: failed,
    errorMessage: failed ? describeError(me.error) : undefined,
    retry: () => void me.refetch(),
  };
}

/**
 * The gate as the rail's visibility answer. A failed check carries its message
 * and a retry that asks /users/me again. Otherwise there is no error, and retry
 * does nothing: there is nothing to recover from.
 */
export function swagStoreAdminVisibility(gate: SwagStoreAdminRailGate): VisibilityAnswer {
  const canSee = (id: string) => gate.canSee(id);
  return gate.isError
    ? { canSee, resolving: gate.isResolving, error: gate.errorMessage, retry: gate.retry }
    : { canSee, resolving: gate.isResolving, retry: () => undefined };
}
