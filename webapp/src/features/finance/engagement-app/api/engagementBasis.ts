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

import { useCallback } from "react";
import { useAsgardeo } from "@asgardeo/react";
import { isEngagementAppBackendConfigured } from "@config/apiConfig";
import { useAccessToken } from "@hooks/useAccessToken";
import { useAsgardeoSub } from "@hooks/useAsgardeoSub";

/** An Engagement App cache key: always `["engagement-app", <subject>, …parts]`. */
export type EngagementKey = readonly unknown[];

/** The first part of every Engagement App query key, for invalidating them all. */
export const ENGAGEMENT_KEY_ROOT = "engagement-app";

/** What every Engagement App request needs: a token, the caller's subject for the cache key, and whether asking is allowed at all. */
export function useEngagementBasis() {
  const { isSignedIn } = useAsgardeo();
  const getToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const sub = subState.status === "ready" ? subState.sub : undefined;
  const ready = isSignedIn && isEngagementAppBackendConfigured() && Boolean(sub);
  const key = useCallback((...parts: readonly unknown[]): EngagementKey => [ENGAGEMENT_KEY_ROOT, sub, ...parts], [sub]);
  return { getToken, sub, subState, retryIdentity, ready, key };
}
