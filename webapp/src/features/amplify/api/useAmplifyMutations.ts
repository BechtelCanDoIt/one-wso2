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

// Writes to amplify-api.
//
// Every POST carries an Idempotency-Key, one per user action rather than one
// per HTTP call: the key is minted on the first call of an attempt and reused
// by every call that overlaps it, so a double click reaches amplify-api twice
// with the same key and its idempotency record answers the second with the
// first's result instead of publishing twice. The key is dropped when the
// attempt settles, so a re-submit after a failure — a new action — gets a new
// one. Controls are also disabled while their mutation is pending, which stops
// the second click in most cases but cannot stop it in the frame between the
// click and the re-render. No React Query `retry`: a 4xx here is a final
// answer.

import { useRef } from "react";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { authedDelete, authedPatch, authedPost } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { amplifyServiceUrls } from "@config/apiConfig";
import { useAsgardeoSub } from "@hooks/useAsgardeoSub";
import { amplifyKey } from "./useAmplifyData";
import type {
  Campaign,
  CampaignDraft,
  CampaignPatch,
  CampaignRegistration,
  ConnectAuthorization,
  LinkedInConnection,
  Share,
  ShareKind,
} from "./amplifyTypes";

// One key per user action: minted by the first call of an attempt, shared by
// every call that overlaps it, released when the attempt settles.
function useIdempotencyKey(): { headers: () => Record<string, string>; release: () => void } {
  const key = useRef<string | null>(null);
  return {
    headers() {
      key.current ??= crypto.randomUUID();
      return { "Idempotency-Key": key.current };
    },
    release() {
      key.current = null;
    },
  };
}

// Marks the key stale and refetches it now, including lists no page is showing. The app's QueryClient sets
// `refetchOnMount: false`, so a stale list that isn't on screen would otherwise never reload: save a post on
// New Post and Current Posts kept its old list until a full refresh. Awaited, so a caller that navigates
// afterwards lands on fresh data.
function refreshNow(qc: QueryClient, queryKey: unknown[]): Promise<void> {
  return qc.invalidateQueries({ queryKey, refetchType: "all" });
}

function useAmplifySub(): string | undefined {
  const { state } = useAsgardeoSub();
  return state.status === "ready" ? state.sub : undefined;
}

/** POST /campaigns (PO and Marketing; the backend 403s anyone else). */
export function useRegisterCampaign() {
  const getAccessToken = useAccessToken();
  const qc = useQueryClient();
  const sub = useAmplifySub();
  const idem = useIdempotencyKey();
  return useMutation<CampaignRegistration | null, Error, { draft: CampaignDraft; shareNow: boolean }>({
    mutationFn: async ({ draft, shareNow }) =>
      authedPost<CampaignRegistration>(
        `${amplifyServiceUrls.campaigns}?shareNow=${shareNow}`,
        await getAccessToken(),
        draft,
        idem.headers(),
      ),
    onSuccess: async () => {
      await refreshNow(qc, amplifyKey("campaigns", sub));
    },
    onSettled: idem.release,
  });
}

/** PATCH /campaigns/{id} with the version that was read (PO and Marketing). */
export function useEditCampaign() {
  const getAccessToken = useAccessToken();
  const qc = useQueryClient();
  const sub = useAmplifySub();
  return useMutation<Campaign | null, Error, { id: string; patch: CampaignPatch }>({
    mutationFn: async ({ id, patch }) =>
      authedPatch<Campaign>(amplifyServiceUrls.campaign(id), await getAccessToken(), patch),
    onSuccess: async () => {
      await refreshNow(qc, amplifyKey("campaigns", sub));
    },
  });
}

/** POST /campaigns/{id}/shares: "Amplify, share this for me". Queued (202), published by the next Run. */
export function useRequestShare() {
  const getAccessToken = useAccessToken();
  const qc = useQueryClient();
  const sub = useAmplifySub();
  const idem = useIdempotencyKey();
  return useMutation<Share | null, Error, { campaignId: string; kind: ShareKind; commentary?: string }>({
    mutationFn: async ({ campaignId, kind, commentary }) =>
      authedPost<Share>(
        amplifyServiceUrls.shares(campaignId),
        await getAccessToken(),
        commentary === undefined ? { kind } : { kind, commentary },
        idem.headers(),
      ),
    onSuccess: async () => {
      await refreshNow(qc, amplifyKey("my-shares", sub));
    },
    onSettled: idem.release,
  });
}

/** POST /connections/linkedin/start. The caller sends the browser to `authorizationUrl`. */
export function useStartLinkedInConnect() {
  const getAccessToken = useAccessToken();
  const idem = useIdempotencyKey();
  return useMutation<ConnectAuthorization | null, Error, { returnTo: string; pendingCampaignId?: string }>({
    mutationFn: async (body) =>
      authedPost<ConnectAuthorization>(
        amplifyServiceUrls.connectStart,
        await getAccessToken(),
        body,
        idem.headers(),
      ),
    onSettled: idem.release,
  });
}

/** POST /connections/linkedin/decline with the LinkedIn profile URL of an employee who doesn't consent to link. */
export function useDeclineLinkedInConsent() {
  const getAccessToken = useAccessToken();
  const idem = useIdempotencyKey();
  return useMutation<null, Error, { profileUrl?: string }>({
    mutationFn: async (body) => {
      await authedPost<unknown>(amplifyServiceUrls.connectDecline, await getAccessToken(), body, idem.headers());
      return null;
    },
    onSettled: idem.release,
  });
}

/** DELETE /connections/linkedin: Amplify revokes the caller's token at LinkedIn, then drops its saved link. */
export function useRemoveLinkedInConnection() {
  const getAccessToken = useAccessToken();
  const qc = useQueryClient();
  const sub = useAmplifySub();
  return useMutation<null, Error, void>({
    mutationFn: async () => {
      await authedDelete(amplifyServiceUrls.connectRemove, await getAccessToken());
      return null;
    },
    onSuccess: async () => {
      await refreshNow(qc, amplifyKey("me", sub));
    },
  });
}

/** POST /connections/linkedin/complete with the code and state LinkedIn sent back. */
export function useCompleteLinkedInConnect() {
  const getAccessToken = useAccessToken();
  const qc = useQueryClient();
  const sub = useAmplifySub();
  const idem = useIdempotencyKey();
  return useMutation<LinkedInConnection | null, Error, { code: string; state: string; redirectUri: string }>({
    mutationFn: async (body) =>
      authedPost<LinkedInConnection>(
        amplifyServiceUrls.connectComplete,
        await getAccessToken(),
        body,
        idem.headers(),
      ),
    onSuccess: async () => {
      await refreshNow(qc, amplifyKey("me", sub));
    },
    onSettled: idem.release,
  });
}
