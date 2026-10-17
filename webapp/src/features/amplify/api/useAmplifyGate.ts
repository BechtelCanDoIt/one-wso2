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

import { useQuery } from "@tanstack/react-query";
import { useAsgardeo } from "@asgardeo/react";
import { HttpError } from "@api/http";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { foldIdentityError, useAsgardeoSub } from "@hooks/useAsgardeoSub";
import { isAmplifyBackendConfigured } from "@config/apiConfig";
import type { VisibilityAnswer } from "@components/side-rail/visibilityFold";
import { fetchAmplifyMe } from "./amplifyClient";
import type { AmplifyMe } from "./amplifyTypes";

export { isAmplifyBackendConfigured };

/** The module's own roles, from `GET /me`. */
export interface AmplifyGate {
  /** May this rail id be shown? Fails closed while the answer is unknown. */
  canSee: (itemId: string) => boolean;
  /** True once /me has answered and the caller is a signed-in employee. */
  isAuthorized: boolean;
  isPo: boolean;
  isMarketing: boolean;
  isSlt: boolean;
  isAdmin: boolean;
  isResolving: boolean;
  isError: boolean;
  errorMessage?: string;
  /** The caller's own record — the screen's identity display. */
  me?: AmplifyMe;
  retry: () => void;
}

export function useAmplifyGate(enabled = true): AmplifyGate {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;
  const configured = isAmplifyBackendConfigured();
  const effectiveEnabled = enabled && configured;

  const query = useQuery<AmplifyMe>({
    queryKey: ["amplify-me", userSub],
    enabled: effectiveEnabled && isSignedIn && Boolean(userSub),
    queryFn: async () => fetchAmplifyMe(await getAccessToken()),
    staleTime: 5 * 60 * 1000,
  });

  const folded = foldIdentityError(query, subState, retryIdentity);
  // A 403 from /me is a terminal "not for you": folded into "not allowed"
  // (hidden), never a landing failure — and it wins over any cached roles.
  const forbidden = folded.error instanceof HttpError && folded.error.status === 403;
  const me = forbidden || !effectiveEnabled ? undefined : folded.data;
  const roles = me?.roles ?? [];
  const isPo = roles.includes("amplify_po");
  const isMarketing = roles.includes("amplify_marketing");
  const isSlt = roles.includes("amplify_slt");
  const isAdmin = roles.includes("amplify_admin");

  // /me answered ⇒ the caller is a signed-in employee Amplify knows. The last
  // good answer is kept through a failing BACKGROUND refetch (TanStack keeps
  // `data` while `status` goes to "error"), so a blip on window focus does not
  // throw a reader out of the screen they are on.
  const isAuthorized = effectiveEnabled && Boolean(me) && !forbidden;

  // Only a failure with nothing to fall back on is a landing error.
  const isError = effectiveEnabled && folded.isError && !forbidden && !me;

  const canSee = (itemId: string): boolean => {
    if (!isAuthorized) return false;
    switch (itemId) {
      // Every signed-in employee gets the everyday rows.
      case "sec-app-amplify":
      case "amplify-posts":
      case "amplify-leaderboard":
      case "amplify-my-campaign":
      case "amplify-team":
        return true;
      // Marketing owns campaign creation and editing; PO shares the tools
      // (`CAMPAIGN_EDITORS = [PO, MKT]` in the backend activity matrix). ADM is
      // not in that column, so it is not offered the screen.
      case "amplify-campaigns":
        return isMarketing || isPo;
      // PO owns the external-share queue, point rules and dashboard
      // (`x-roles: [PO]` throughout; ADM is not a superset).
      case "amplify-po-review":
        return isPo;
      // SLT reporting — Phase 2, and hidden from the rail regardless (its item
      // carries no path); this only decides the route's own state.
      case "amplify-reports":
        return isSlt;
      case "amplify-admin":
        return isAdmin;
      // An unknown id must not fall open.
      default:
        return false;
    }
  };

  return {
    canSee,
    isAuthorized,
    isPo,
    isMarketing,
    isSlt,
    isAdmin,
    isResolving: effectiveEnabled && folded.isLoading,
    isError,
    errorMessage: isError ? describeError(folded.error) : undefined,
    me,
    retry: () => void folded.refetch(),
  };
}

/**
 * The gate's four facts for the rail fold. Reports a failed read (so a landing
 * can offer Retry) but treats a 403 as "not allowed", which is why `isError`
 * above already excludes it.
 */
export function amplifyVisibility(gate: AmplifyGate): VisibilityAnswer {
  return gate.isError
    ? { canSee: gate.canSee, resolving: gate.isResolving, error: gate.errorMessage, retry: gate.retry }
    : { canSee: gate.canSee, resolving: gate.isResolving, retry: () => undefined };
}
