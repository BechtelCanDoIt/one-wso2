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

// The Amplify API client. A thin, typed layer over @api/http that adds the two
// headers the contract requires and nothing else — no caching, no state, no
// retry of its own. Screens call these through React Query hooks
// (amplifyHooks.ts), which own the query keys.
//
// Two cross-cutting requirements from the contract, handled once here:
//
//  * `X-Correlation-ID` (^[A-Za-z0-9._-]{1,64}$) on EVERY request, so a failure
//    can be traced across the proxy and the backend. Generated per call.
//
//  * `Idempotency-Key` (1-255 chars) on every MUTATION (ADR-024), so a retried
//    create/share/approve cannot be applied twice upstream. The caller may pass
//    its own key when the SAME logical action must be retried without
//    duplicating (e.g. a share dialog reopened after a transient failure);
//    otherwise one is generated per call.
//
// The problem-details body's stable `code` is the thing callers branch on —
// never `detail`, which is prose that changes. `amplifyProblemCode` reads it.

import { authedDelete, authedGet, authedPatch, authedPost, authedPut, HttpError } from "@api/http";
import { amplifyServiceUrls, buildAmplifyCampaignsUrl, buildAmplifyTeamUrl } from "@config/apiConfig";
import type {
  AmplifyMe,
  Announcement,
  Campaign,
  CampaignDraft,
  CampaignPage,
  CampaignPatch,
  CampaignRegistration,
  CategoryRef,
  ConnectAuthorization,
  ConnectComplete,
  ExternalShare,
  ExternalShareClaim,
  ExternalSharePage,
  ExternalShareStatus,
  Leaderboard,
  LedgerEntry,
  LinkedInConnection,
  MyPoints,
  PointsAdjustment,
  PointsHistory,
  PointRule,
  PoDashboard,
  SchedulerSyncResult,
  SettingChanges,
  SettingList,
  Share,
  ShareCommand,
  TeamPage,
} from "./amplifyTypes";

// 32 hex chars — well inside the 1..64 charset the contract allows, and
// collision-free enough for a request id. crypto.randomUUID is available in
// every browser this app targets, but a fallback keeps a locked-down
// environment (or a test) from throwing on a missing API.
function randomToken(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID().replace(/-/g, "");
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function newCorrelationId(): string {
  return randomToken();
}

export function newIdempotencyKey(): string {
  return `amplify-${randomToken()}`;
}

// ---- typed calls ----------------------------------------------------------
//
// `idempotencyKey` is threaded through every mutation so a screen that must
// retry the SAME action can pass the key it already used.

export function fetchAmplifyMe(accessToken: string): Promise<AmplifyMe> {
  return authedGet<AmplifyMe>(amplifyServiceUrls.me, accessToken, {
    "X-Correlation-ID": newCorrelationId(),
  });
}

export function fetchCampaigns(
  accessToken: string,
  params: { status?: string; window?: string; tag?: string; page?: number; size?: number } = {},
): Promise<CampaignPage> {
  return authedGet<CampaignPage>(buildAmplifyCampaignsUrl(params), accessToken, {
    "X-Correlation-ID": newCorrelationId(),
  });
}

export function fetchCampaign(accessToken: string, id: string): Promise<Campaign> {
  return authedGet<Campaign>(amplifyServiceUrls.campaign(id), accessToken, {
    "X-Correlation-ID": newCorrelationId(),
  });
}

export function createCampaign(
  accessToken: string,
  draft: CampaignDraft,
  opts: { shareNow?: boolean; idempotencyKey?: string } = {},
): Promise<CampaignRegistration> {
  const url = opts.shareNow
    ? `${amplifyServiceUrls.campaigns}?shareNow=true`
    : amplifyServiceUrls.campaigns;
  return authedPost<CampaignRegistration>(url, accessToken, draft, {
    "X-Correlation-ID": newCorrelationId(),
    "Idempotency-Key": opts.idempotencyKey ?? newIdempotencyKey(),
  }).then((r) => r as CampaignRegistration);
}

export function patchCampaign(
  accessToken: string,
  id: string,
  patch: CampaignPatch,
  idempotencyKey?: string,
): Promise<Campaign> {
  return authedPatch<Campaign>(amplifyServiceUrls.campaign(id), accessToken, patch, {
    "X-Correlation-ID": newCorrelationId(),
    "Idempotency-Key": idempotencyKey ?? newIdempotencyKey(),
  }).then((r) => r as Campaign);
}

export function archiveCampaign(accessToken: string, id: string, idempotencyKey?: string): Promise<void> {
  return authedDelete(amplifyServiceUrls.campaign(id), accessToken, {
    "X-Correlation-ID": newCorrelationId(),
    "Idempotency-Key": idempotencyKey ?? newIdempotencyKey(),
  });
}

export function fetchTags(accessToken: string): Promise<{ tags: string[] }> {
  return authedGet<{ tags: string[] }>(amplifyServiceUrls.tags, accessToken, {
    "X-Correlation-ID": newCorrelationId(),
  });
}

export function fetchCategories(accessToken: string): Promise<{ categories: CategoryRef[] }> {
  return authedGet<{ categories: CategoryRef[] }>(amplifyServiceUrls.categories, accessToken, {
    "X-Correlation-ID": newCorrelationId(),
  });
}

// ---- LinkedIn connection --------------------------------------------------

export function startLinkedInConnect(
  accessToken: string,
  body: { returnTo?: string; pendingCampaignId?: string },
): Promise<ConnectAuthorization> {
  return authedPost<ConnectAuthorization>(amplifyServiceUrls.connectStart, accessToken, body, {
    "X-Correlation-ID": newCorrelationId(),
    "Idempotency-Key": newIdempotencyKey(),
  }).then((r) => r as ConnectAuthorization);
}

export function completeLinkedInConnect(
  accessToken: string,
  body: ConnectComplete,
): Promise<LinkedInConnection> {
  return authedPost<LinkedInConnection>(amplifyServiceUrls.connectComplete, accessToken, body, {
    "X-Correlation-ID": newCorrelationId(),
    "Idempotency-Key": newIdempotencyKey(),
  }).then((r) => r as LinkedInConnection);
}

export function disconnectLinkedIn(accessToken: string): Promise<void> {
  return authedDelete(amplifyServiceUrls.disconnect, accessToken, {
    "X-Correlation-ID": newCorrelationId(),
    "Idempotency-Key": newIdempotencyKey(),
  });
}

// ---- Shares ---------------------------------------------------------------

export function shareCampaign(
  accessToken: string,
  campaignId: string,
  command: ShareCommand,
  idempotencyKey?: string,
): Promise<Share> {
  return authedPost<Share>(amplifyServiceUrls.campaignShares(campaignId), accessToken, command, {
    "X-Correlation-ID": newCorrelationId(),
    "Idempotency-Key": idempotencyKey ?? newIdempotencyKey(),
  }).then((r) => r as Share);
}

export function fetchMyShares(accessToken: string): Promise<{ items: Share[] }> {
  return authedGet<{ items: Share[] }>(amplifyServiceUrls.myShares, accessToken, {
    "X-Correlation-ID": newCorrelationId(),
  });
}

// ---- External shares ------------------------------------------------------

export function claimExternalShare(
  accessToken: string,
  claim: ExternalShareClaim,
  idempotencyKey?: string,
): Promise<ExternalShare> {
  return authedPost<ExternalShare>(amplifyServiceUrls.externalShares, accessToken, claim, {
    "X-Correlation-ID": newCorrelationId(),
    "Idempotency-Key": idempotencyKey ?? newIdempotencyKey(),
  }).then((r) => r as ExternalShare);
}

export function fetchMyExternalShares(accessToken: string): Promise<{ items: ExternalShare[] }> {
  return authedGet<{ items: ExternalShare[] }>(amplifyServiceUrls.myExternalShares, accessToken, {
    "X-Correlation-ID": newCorrelationId(),
  });
}

export function fetchPoExternalShares(
  accessToken: string,
  params: { status?: ExternalShareStatus | "ALL"; page?: number; size?: number } = {},
): Promise<ExternalSharePage> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.size !== undefined) qs.set("size", String(params.size));
  const query = qs.toString();
  const url = query
    ? `${amplifyServiceUrls.poExternalShares}?${query}`
    : amplifyServiceUrls.poExternalShares;
  return authedGet<ExternalSharePage>(url, accessToken, { "X-Correlation-ID": newCorrelationId() });
}

function poDecision(
  accessToken: string,
  url: string,
  body: unknown,
  idempotencyKey?: string,
): Promise<ExternalShare> {
  return authedPost<ExternalShare>(url, accessToken, body, {
    "X-Correlation-ID": newCorrelationId(),
    "Idempotency-Key": idempotencyKey ?? newIdempotencyKey(),
  }).then((r) => r as ExternalShare);
}

export function approveExternalShare(accessToken: string, id: string, idempotencyKey?: string) {
  return poDecision(accessToken, amplifyServiceUrls.poExternalShareApprove(id), {}, idempotencyKey);
}

export function rejectExternalShare(
  accessToken: string,
  id: string,
  reason: string,
  idempotencyKey?: string,
) {
  return poDecision(
    accessToken,
    amplifyServiceUrls.poExternalShareReject(id),
    { reason },
    idempotencyKey,
  );
}

export function markExternalShareAmplified(accessToken: string, id: string, idempotencyKey?: string) {
  return poDecision(accessToken, amplifyServiceUrls.poExternalShareAmplified(id), {}, idempotencyKey);
}

// ---- Points ---------------------------------------------------------------

export function fetchPointRules(accessToken: string): Promise<{ items: PointRule[] }> {
  return authedGet<{ items: PointRule[] }>(amplifyServiceUrls.pointRules, accessToken, {
    "X-Correlation-ID": newCorrelationId(),
  });
}

export function createPointRule(
  accessToken: string,
  rule: { action: PointRule["action"]; points: number; effectiveFrom: string },
  idempotencyKey?: string,
): Promise<PointRule> {
  return authedPost<PointRule>(amplifyServiceUrls.pointRules, accessToken, rule, {
    "X-Correlation-ID": newCorrelationId(),
    "Idempotency-Key": idempotencyKey ?? newIdempotencyKey(),
  }).then((r) => r as PointRule);
}

export function adjustPoints(
  accessToken: string,
  adjustment: PointsAdjustment,
  idempotencyKey?: string,
): Promise<LedgerEntry> {
  return authedPost<LedgerEntry>(amplifyServiceUrls.pointAdjustments, accessToken, adjustment, {
    "X-Correlation-ID": newCorrelationId(),
    "Idempotency-Key": idempotencyKey ?? newIdempotencyKey(),
  }).then((r) => r as LedgerEntry);
}

export function reversePoints(
  accessToken: string,
  reference: string,
  reason: string,
  idempotencyKey?: string,
): Promise<LedgerEntry> {
  return authedPost<LedgerEntry>(
    amplifyServiceUrls.pointReverse(reference),
    accessToken,
    { reason },
    {
      "X-Correlation-ID": newCorrelationId(),
      "Idempotency-Key": idempotencyKey ?? newIdempotencyKey(),
    },
  ).then((r) => r as LedgerEntry);
}

// ---- Leaderboard / Team ---------------------------------------------------

export function fetchLeaderboard(accessToken: string, period = "ALL"): Promise<Leaderboard> {
  const url = `${amplifyServiceUrls.leaderboard}?period=${encodeURIComponent(period)}`;
  return authedGet<Leaderboard>(url, accessToken, { "X-Correlation-ID": newCorrelationId() });
}

export function fetchMyPoints(accessToken: string, period = "ALL"): Promise<MyPoints> {
  const url = `${amplifyServiceUrls.myPoints}?period=${encodeURIComponent(period)}`;
  return authedGet<MyPoints>(url, accessToken, { "X-Correlation-ID": newCorrelationId() });
}

export function fetchTeam(
  accessToken: string,
  params: { period?: string; q?: string; sort?: string; page?: number; size?: number } = {},
): Promise<TeamPage> {
  return authedGet<TeamPage>(buildAmplifyTeamUrl(params), accessToken, {
    "X-Correlation-ID": newCorrelationId(),
  });
}

export function fetchTeamHistory(
  accessToken: string,
  employeeId: string,
  params: { page?: number; size?: number } = {},
): Promise<PointsHistory> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.size !== undefined) qs.set("size", String(params.size));
  const query = qs.toString();
  const base = amplifyServiceUrls.teamHistory(employeeId);
  const url = query ? `${base}?${query}` : base;
  return authedGet<PointsHistory>(url, accessToken, { "X-Correlation-ID": newCorrelationId() });
}

// ---- PO dashboard ---------------------------------------------------------

export function fetchPoDashboard(accessToken: string, month?: string): Promise<PoDashboard> {
  return authedGet<PoDashboard>(amplifyServiceUrls.poDashboard(month), accessToken, {
    "X-Correlation-ID": newCorrelationId(),
  });
}

// ---- Admin ----------------------------------------------------------------

export function fetchAdminAnnouncements(
  accessToken: string,
  status?: string,
): Promise<{ items: Announcement[] }> {
  const url = status
    ? `${amplifyServiceUrls.adminAnnouncements}?status=${encodeURIComponent(status)}`
    : amplifyServiceUrls.adminAnnouncements;
  return authedGet<{ items: Announcement[] }>(url, accessToken, {
    "X-Correlation-ID": newCorrelationId(),
  });
}

export function retryAnnouncement(
  accessToken: string,
  id: string,
  idempotencyKey?: string,
): Promise<void> {
  return authedPost<unknown>(
    amplifyServiceUrls.adminAnnouncementRetry(id),
    accessToken,
    {},
    {
      "X-Correlation-ID": newCorrelationId(),
      "Idempotency-Key": idempotencyKey ?? newIdempotencyKey(),
    },
  ).then(() => undefined);
}

export function fetchAdminSettings(accessToken: string): Promise<SettingList> {
  return authedGet<SettingList>(amplifyServiceUrls.adminSettings, accessToken, {
    "X-Correlation-ID": newCorrelationId(),
  });
}

export function putAdminSettings(
  accessToken: string,
  changes: SettingChanges,
  idempotencyKey?: string,
): Promise<SettingList> {
  return authedPut<SettingList>(amplifyServiceUrls.adminSettings, accessToken, changes, {
    "X-Correlation-ID": newCorrelationId(),
    "Idempotency-Key": idempotencyKey ?? newIdempotencyKey(),
  }).then((r) => r as SettingList);
}

export function syncScheduler(accessToken: string, idempotencyKey?: string): Promise<SchedulerSyncResult> {
  return authedPost<SchedulerSyncResult>(
    amplifyServiceUrls.adminSchedulerSync,
    accessToken,
    {},
    {
      "X-Correlation-ID": newCorrelationId(),
      "Idempotency-Key": idempotencyKey ?? newIdempotencyKey(),
    },
  ).then((r) => r as SchedulerSyncResult);
}

// ---- problem details ------------------------------------------------------

/**
 * The stable RFC-9457 `code` from a failed Amplify response, or undefined.
 * Callers branch on this and never on `detail`.
 */
export function amplifyProblemCode(err: unknown): string | undefined {
  if (!(err instanceof HttpError) || !err.responseBody) return undefined;
  try {
    const parsed = JSON.parse(err.responseBody) as { code?: unknown };
    return typeof parsed?.code === "string" ? parsed.code : undefined;
  } catch {
    return undefined;
  }
}

/** True when the failure is the campaign already being registered. */
export function isAlreadyRegistered(err: unknown): boolean {
  return amplifyProblemCode(err) === "CAMPAIGN_ALREADY_REGISTERED";
}
