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

import type { VisibilityAnswer } from "@components/side-rail/visibilityFold";
import { describeError } from "@api/errors";
import { isEngagementAppBackendConfigured } from "@config/apiConfig";
import { ENGAGEMENT_GROUP_ID, ENGAGEMENT_ITEM } from "@constants/engagementApps";
import { engagementAccess, type EngagementAccess } from "../model/engagementAccess";
import { useEngagementUserInfo } from "./useEngagementUserInfo";

export interface EngagementRailGate {
  canSee: (itemId: string) => boolean;
  isResolving: boolean;
  /** True when the access check itself failed; reported as "couldn't check", never as "no access". */
  isError: boolean;
  errorMessage: string | undefined;
  retry: () => void;
}

/** Which rows an access answer opens. Each group shows when any of its rows does. */
export function engagementCanSee(itemId: string, access: EngagementAccess): boolean {
  switch (itemId) {
    case ENGAGEMENT_ITEM.dashboard:
      return access.dashboard;
    case ENGAGEMENT_ITEM.approvals:
      return access.approvals;
    case ENGAGEMENT_ITEM.engagements:
      return access.engagements;
    case ENGAGEMENT_ITEM.allocations:
      return access.allocations;
    case ENGAGEMENT_ITEM.travelRequests:
      return access.travelRequests;
    case ENGAGEMENT_ITEM.invoices:
      return access.invoices;
    case ENGAGEMENT_ITEM.reports:
      return access.reports;
    case ENGAGEMENT_ITEM.visas:
      return access.visasDocuments;
    case ENGAGEMENT_ITEM.settings:
      return access.settings;
    case ENGAGEMENT_ITEM.myTravelRequests:
      return access.myTravelRequests;
    case ENGAGEMENT_ITEM.myDocuments:
      return access.myDocuments || access.myVisas;
    case ENGAGEMENT_ITEM.myAllocations:
      return access.myAllocations;
    case ENGAGEMENT_GROUP_ID:
      return access.anyFinance;
    default:
      // Fail closed: an Engagement App id with no case here is hidden from everyone.
      return false;
  }
}

/** Hidden while `/user-info` is in flight (so rows never flash in for someone without access) and when the check failed (failing closed, reported through isError). */
export function useEngagementRailGate(enabled: boolean): EngagementRailGate {
  const info = useEngagementUserInfo(enabled);
  const configured = isEngagementAppBackendConfigured();
  const active = enabled && configured;
  const isResolving = active && (info.isPending || info.isLoading);
  const failed = active && info.isError;
  const access = engagementAccess(info.data);
  return {
    canSee: (itemId) => {
      if (!configured) return true;
      if (!active || isResolving || failed) return false;
      return engagementCanSee(itemId, access);
    },
    isResolving,
    isError: failed,
    errorMessage: failed ? describeError(info.error) : undefined,
    retry: () => void info.refetch(),
  };
}

/** Rail and landing facts. */
export function engagementVisibility(gate: EngagementRailGate): VisibilityAnswer {
  return { canSee: (id: string) => gate.canSee(id), resolving: gate.isResolving, retry: () => undefined };
}
