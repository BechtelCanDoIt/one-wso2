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

// Who the Procurement team's screens are for, and the rail's view of it.
// Nothing here is access control: the backend checks the role on every call.

import { describeError } from "@api/errors";
import type { VisibilityAnswer } from "@components/side-rail/visibilityFold";
import { useProcurementMe } from "../api/useProcurement";
import { isProcurementAvailable } from "../api/procurementApi";

const TEAM_ROLES = ["procurement_user", "procurement_admin"];

/** Whether a person's roles let them handle requests. */
export const hasTeamRole = (roles: readonly string[]): boolean => roles.some((role) => TEAM_ROLES.includes(role));

export interface ProcurementTeamRailGate {
  canSee: boolean;
  isResolving: boolean;
  error: string | undefined;
  retry: () => void;
}

/**
 * Hidden while the roles are in flight, so the row never flashes in for someone
 * without a role, and when they could not be read (reported through `error`).
 *
 * @param enabled - Whether the Procurement perspective is the open one
 */
export function useProcurementTeamRailGate(enabled: boolean): ProcurementTeamRailGate {
  const active = enabled && isProcurementAvailable();
  const me = useProcurementMe(active);
  return {
    canSee: active && !me.isError && Boolean(me.data) && hasTeamRole(me.data?.roles ?? []),
    isResolving: active && me.isPending,
    error: active && me.isError ? describeError(me.error) : undefined,
    retry: () => void me.refetch(),
  };
}

export function procurementTeamVisibility(gate: ProcurementTeamRailGate): VisibilityAnswer {
  const canSee = () => gate.canSee;
  return gate.error
    ? { canSee, resolving: gate.isResolving, error: gate.error, retry: gate.retry }
    : { canSee, resolving: gate.isResolving, retry: () => undefined };
}
