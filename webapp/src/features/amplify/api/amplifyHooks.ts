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

// React Query hooks over the Amplify client. One place for the query keys so a
// mutation's invalidation and a screen's read agree — the failure that avoids
// is an approve that leaves the queue looking unchanged.
//
// Every key carries the caller's `sub`, so a sign-out → different-user sign-in
// in the same tab cannot briefly serve the previous user's rows (the same
// discriminator every other backend's hooks use — see @hooks/useAsgardeoSub).

import { useQuery } from "@tanstack/react-query";
import { useAsgardeo } from "@asgardeo/react";
import { useAccessToken } from "@hooks/useAccessToken";
import { foldIdentityError, useAsgardeoSub } from "@hooks/useAsgardeoSub";
import { defaultQueryRetry } from "@api/http";
import { isAmplifyBackendConfigured } from "@config/apiConfig";
import {
  fetchAdminAnnouncements,
  fetchAdminSettings,
  fetchCampaigns,
  fetchCategories,
  fetchLeaderboard,
  fetchMyExternalShares,
  fetchMyPoints,
  fetchMyShares,
  fetchPointRules,
  fetchPoDashboard,
  fetchPoExternalShares,
  fetchTags,
  fetchTeam,
  fetchTeamHistory,
} from "./amplifyClient";

/** Shared plumbing: identity-gated, configured-gated, retry policy. */
function useAmplifyQuery<T>(
  key: readonly unknown[],
  queryFn: (accessToken: string) => Promise<T>,
  opts: { enabled?: boolean; staleTime?: number } = {},
) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;
  const configured = isAmplifyBackendConfigured();
  const enabled = (opts.enabled ?? true) && configured && isSignedIn && Boolean(userSub);
  const query = useQuery<T>({
    queryKey: [...key, userSub],
    enabled,
    queryFn: async () => queryFn(await getAccessToken()),
    staleTime: opts.staleTime ?? 30_000,
    retry: defaultQueryRetry,
  });
  return foldIdentityError(query, subState, retryIdentity);
}

export function useAmplifyCampaigns(params: {
  status?: string;
  window?: string;
  tag?: string;
  page?: number;
  size?: number;
}) {
  return useAmplifyQuery(["amplify-campaigns", params], (t) => fetchCampaigns(t, params));
}

export function useAmplifyTags() {
  return useAmplifyQuery(["amplify-tags"], (t) => fetchTags(t), { staleTime: 5 * 60_000 });
}

export function useAmplifyCategories() {
  return useAmplifyQuery(["amplify-categories"], (t) => fetchCategories(t), {
    staleTime: 5 * 60_000,
  });
}

export function useAmplifyLeaderboard(period = "ALL") {
  return useAmplifyQuery(["amplify-leaderboard", period], (t) => fetchLeaderboard(t, period));
}

export function useAmplifyMyPoints(period = "ALL") {
  return useAmplifyQuery(["amplify-my-points", period], (t) => fetchMyPoints(t, period));
}

export function useAmplifyMyShares() {
  return useAmplifyQuery(["amplify-my-shares"], (t) => fetchMyShares(t));
}

export function useAmplifyTeam(params: {
  period?: string;
  q?: string;
  sort?: string;
  page?: number;
  size?: number;
}) {
  return useAmplifyQuery(["amplify-team", params], (t) => fetchTeam(t, params));
}

export function useAmplifyTeamHistory(
  employeeId: string | undefined,
  opts: { enabled?: boolean; page?: number; size?: number } = {},
) {
  return useAmplifyQuery(
    ["amplify-team-history", employeeId, { page: opts.page, size: opts.size }],
    (t) => fetchTeamHistory(t, employeeId!, { page: opts.page, size: opts.size }),
    { enabled: (opts.enabled ?? true) && Boolean(employeeId) },
  );
}

export function useAmplifyMyExternalShares() {
  return useAmplifyQuery(["amplify-my-external-shares"], (t) => fetchMyExternalShares(t));
}

export function useAmplifyPoExternalShares(
  params: { status?: "PENDING" | "APPROVED" | "REJECTED" | "AMPLIFIED" | "ALL"; page?: number; size?: number },
) {
  return useAmplifyQuery(["amplify-po-external-shares", params], (t) =>
    fetchPoExternalShares(t, params),
  );
}

export function useAmplifyPointRules() {
  return useAmplifyQuery(["amplify-point-rules"], (t) => fetchPointRules(t));
}

export function useAmplifyPoDashboard(month?: string) {
  return useAmplifyQuery(["amplify-po-dashboard", month], (t) => fetchPoDashboard(t, month));
}

export function useAmplifyAdminSettings() {
  return useAmplifyQuery(["amplify-admin-settings"], (t) => fetchAdminSettings(t));
}

export function useAmplifyAdminAnnouncements(status?: string) {
  return useAmplifyQuery(["amplify-admin-announcements", status], (t) =>
    fetchAdminAnnouncements(t, status),
  );
}

/** The query-key prefixes a mutation should invalidate, named once. */
export const AMPLIFY_QUERY_KEYS = {
  me: ["amplify-me"] as const,
  campaigns: ["amplify-campaigns"] as const,
  myShares: ["amplify-my-shares"] as const,
  myExternalShares: ["amplify-my-external-shares"] as const,
  poExternalShares: ["amplify-po-external-shares"] as const,
  pointRules: ["amplify-point-rules"] as const,
  leaderboard: ["amplify-leaderboard"] as const,
  myPoints: ["amplify-my-points"] as const,
  team: ["amplify-team"] as const,
  poDashboard: ["amplify-po-dashboard"] as const,
  adminSettings: ["amplify-admin-settings"] as const,
  adminAnnouncements: ["amplify-admin-announcements"] as const,
} as const;
