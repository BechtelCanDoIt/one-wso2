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

import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { HttpError } from "@api/http";
import { ENGAGEMENT_KEY_ROOT } from "./engagementBasis";

/** Quiet time after a refresh, so a burst of 403s from one page costs one refetch. */
const COOLDOWN_MS = 3000;

/** Per client: when the last refresh finished (or Infinity while one is running). */
const lastRefresh = new WeakMap<QueryClient, number>();

const isForbidden = (error: unknown): boolean => error instanceof HttpError && error.status === 403;

/** Whether key is an Engagement App key other than the /user-info one (whose own 403 must not trigger itself). */
const isEngagementKey = (key: readonly unknown[] | undefined): boolean =>
  key?.[0] === ENGAGEMENT_KEY_ROOT && key[2] !== "user-info";

/** Refetch /user-info once (guarded), so the side rail and every page re-decide from fresh privileges. */
function refreshAccess(client: QueryClient): void {
  const last = lastRefresh.get(client);
  if (last !== undefined && Date.now() - last < COOLDOWN_MS) return;
  lastRefresh.set(client, Number.POSITIVE_INFINITY);
  const done = () => lastRefresh.set(client, Date.now());
  client
    .invalidateQueries({ predicate: (q) => q.queryKey[0] === ENGAGEMENT_KEY_ROOT && q.queryKey[2] === "user-info" })
    .then(done, done);
}

/**
 * Privileges can shrink mid-session while /user-info is cached for minutes, so the rail would keep offering a page
 * the backend now refuses. When any Engagement App read or write answers 403, ask /user-info again, once per burst.
 * A refetch never causes another 403 by itself and 4xx answers are not retried, so this cannot loop.
 */
export function useRefreshAccessOnForbidden(): void {
  const client = useQueryClient();
  useEffect(() => {
    const stopQueries = client.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error" && isForbidden(event.action.error) && isEngagementKey(event.query.queryKey)) {
        refreshAccess(client);
      }
    });
    const stopMutations = client.getMutationCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        event.action.type === "error" &&
        isForbidden(event.action.error) &&
        event.mutation.options.mutationKey?.[0] === ENGAGEMENT_KEY_ROOT
      ) {
        refreshAccess(client);
      }
    });
    return () => {
      stopQueries();
      stopMutations();
    };
  }, [client]);
}
