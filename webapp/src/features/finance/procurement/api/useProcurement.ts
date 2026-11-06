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

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAsgardeo } from "@asgardeo/react";
import { defaultQueryRetry } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import type { Person, PurchaseRequestInput } from "../types";
import { createProcurementApi, isProcurementAvailable } from "./procurementApi";

const REFERENCE_STALE_TIME = 5 * 60 * 1000;
const MIN_DIRECTORY_QUERY = 2;

/** The signed-in user as a Person, once their id_token has been read. */
function useSignedInPerson(): Person | undefined {
  const { sub, email, displayName, ready } = useAsgardeoUser();
  return useMemo(
    () => (ready && sub && email ? { id: sub, name: displayName ?? email, email } : undefined),
    [ready, sub, email, displayName],
  );
}

/**
 * Everything a Procurement query needs: the API, who is asking, and whether
 * asking is allowed yet. Keys carry the user's id so one account's cache is
 * never served to another.
 */
function useProcurementContext() {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const person = useSignedInPerson();
  const api = useMemo(
    () => (person ? createProcurementApi(getAccessToken, person) : undefined),
    [getAccessToken, person],
  );
  return { api, userId: person?.id, enabled: isSignedIn && isProcurementAvailable() && Boolean(api) };
}

const root = (userId: string | undefined) => ["procurement", userId] as const;

export function useProcurementMe() {
  const { api, userId, enabled } = useProcurementContext();
  return useQuery({
    queryKey: [...root(userId), "me"],
    enabled,
    staleTime: REFERENCE_STALE_TIME,
    retry: defaultQueryRetry,
    queryFn: () => api!.getMe(),
  });
}

export function useProcurementLookups() {
  const { api, userId, enabled } = useProcurementContext();
  return useQuery({
    queryKey: [...root(userId), "lookups"],
    enabled,
    staleTime: REFERENCE_STALE_TIME,
    retry: defaultQueryRetry,
    queryFn: () => api!.getLookups(),
  });
}

/** Directory matches for the team lead picker; asks nothing until the query is long enough. */
export function useDirectorySearch(query: string) {
  const { api, userId, enabled } = useProcurementContext();
  const trimmed = query.trim();
  return useQuery({
    queryKey: [...root(userId), "directory", trimmed.toLowerCase()],
    enabled: enabled && trimmed.length >= MIN_DIRECTORY_QUERY,
    staleTime: REFERENCE_STALE_TIME,
    retry: defaultQueryRetry,
    queryFn: () => api!.searchDirectory(trimmed),
  });
}

export function useMyRequests() {
  const { api, userId, enabled } = useProcurementContext();
  return useQuery({
    queryKey: [...root(userId), "requests"],
    enabled,
    retry: defaultQueryRetry,
    queryFn: () => api!.listMyRequests(),
  });
}

export function useRequest(requestId: string | undefined) {
  const { api, userId, enabled } = useProcurementContext();
  return useQuery({
    queryKey: [...root(userId), "request", requestId],
    enabled: enabled && Boolean(requestId),
    retry: defaultQueryRetry,
    queryFn: () => api!.getRequest(requestId!),
  });
}

interface SubmitVariables {
  input: PurchaseRequestInput;
  files: File[];
}

/** Raise a request. Refreshes the list, the one thing a new request changes. */
export function useSubmitRequest() {
  const { api, userId } = useProcurementContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, files }: SubmitVariables) => api!.submitRequest(input, files),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...root(userId), "requests"] }),
  });
}

/** Resubmit a rejected request. Refreshes that request and the list. */
export function useResubmitRequest(requestId: string) {
  const { api, userId } = useProcurementContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, files }: SubmitVariables) => api!.resubmitRequest(requestId, input, files),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [...root(userId), "request", requestId] }),
        queryClient.invalidateQueries({ queryKey: [...root(userId), "requests"] }),
      ]),
  });
}
