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

// Reads for the Dashboarding boards. Same scoping as useAmplifyData: every key carries the signed-in
// subject. The API caches each board for 60 s, so the UI holds it for the same time.

import { useQuery } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { amplifyServiceUrls } from "@config/apiConfig";
import { foldIdentityError } from "@hooks/useAsgardeoSub";
import { amplifyRetry } from "../util/amplifyError";
import { amplifyKey, useAmplifyQueryBasis } from "./useAmplifyData";
import type {
  DashboardGlance,
  DashboardOperations,
  DashboardParticipation,
  DashboardCampaigns,
  DashboardScorecard,
  GroupBoard,
} from "./amplifyTypes";

const BOARD_STALE_MS = 60 * 1000;

function useBoard<T>(name: string, url: string, enabled: boolean, ...keyRest: unknown[]) {
  const { getAccessToken, subState, retryIdentity, userSub, ready } = useAmplifyQueryBasis();
  const query = useQuery<T>({
    queryKey: amplifyKey(name, userSub, ...keyRest),
    enabled: ready && enabled,
    queryFn: async () => authedGet<T>(url, await getAccessToken()),
    staleTime: BOARD_STALE_MS,
    retry: amplifyRetry,
  });
  return foldIdentityError(query, subState, retryIdentity);
}

export function useDashboardOperations() {
  return useBoard<DashboardOperations>("dashboard-operations", amplifyServiceUrls.dashboardOperations, true);
}

/** Post performance. `campaignId` picks the selected post; the API defaults to the one with the most reposts. */
export function useDashboardCampaigns(campaignId?: string) {
  const params = new URLSearchParams();
  if (campaignId) params.set("campaignId", campaignId);
  const qs = params.toString();
  return useBoard<DashboardCampaigns>(
    "dashboard-campaigns",
    qs ? `${amplifyServiceUrls.dashboardCampaigns}?${qs}` : amplifyServiceUrls.dashboardCampaigns,
    true,
    campaignId ?? "",
  );
}

export function useDashboardParticipation() {
  return useBoard<DashboardParticipation>("dashboard-participation", amplifyServiceUrls.dashboardParticipation, true);
}

export function useDashboardGlance() {
  return useBoard<DashboardGlance>("dashboard-glance", amplifyServiceUrls.dashboardGlance, true);
}

export function useDashboardScorecard() {
  return useBoard<DashboardScorecard>("dashboard-scorecard", amplifyServiceUrls.dashboardScorecard, true);
}

/** Teams or BUs ranked against each other; `bu` narrows `TEAM` to one business unit. */
export function useGroupBoard(by: "TEAM" | "BU", bu?: string) {
  const params = new URLSearchParams({ by });
  if (by === "TEAM" && bu) params.set("bu", bu);
  return useBoard<GroupBoard>(
    "leaderboard-groups",
    `${amplifyServiceUrls.leaderboardGroups}?${params}`,
    true,
    by,
    bu ?? "",
  );
}
