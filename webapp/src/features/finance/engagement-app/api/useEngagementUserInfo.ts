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

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { engagementServiceUrls } from "@config/apiConfig";
import { foldIdentityError } from "@hooks/useAsgardeoSub";
import { readSessionCache, writeSessionCache } from "./sessionCache";
import { engagementAccess, type EngagementAccess } from "../model/engagementAccess";
import type { UserInfo } from "./engagementTypes";
import { useEngagementBasis } from "./engagementBasis";

const CACHE = "user-info";

/** GET /user-info: the caller's privileges per legacy app. */
export function useEngagementUserInfo(enabled = true): UseQueryResult<UserInfo, Error> {
  const { getToken, ready, key, sub, subState, retryIdentity } = useEngagementBasis();
  const query = useQuery<UserInfo, Error>({
    queryKey: key("user-info"),
    queryFn: async () => {
      const info = await authedGet<UserInfo>(engagementServiceUrls.userInfo, await getToken());
      writeSessionCache(CACHE, sub, info);
      return info;
    },
    // On a reload, the last answer for this person stands in at once and is asked again in the background (initialDataUpdatedAt 0 makes it stale).
    // The backend decides every call; a 403 re-asks (useRefreshAccessOnForbidden); a fresh answer replaces this one.
    initialData: () => readSessionCache<UserInfo>(CACHE, sub),
    initialDataUpdatedAt: 0,
    enabled: ready && enabled,
    // The backend caches the role tables for a minute; asking more often buys nothing.
    staleTime: 5 * 60 * 1000,
    retry: httpRetry,
  });
  return foldIdentityError(query, subState, retryIdentity);
}

/** The caller's access, from the shared /user-info answer. Every page reads it this way. */
export function useEngagementAccess(): EngagementAccess {
  const info = useEngagementUserInfo();
  return engagementAccess(info.data);
}
