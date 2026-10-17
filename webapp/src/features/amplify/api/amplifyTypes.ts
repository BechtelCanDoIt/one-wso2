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

// Types transcribed from the Amplify API contract
// (apps/amplify-api/openapi.yaml). Field names are the contract's own: the
// top-level DTOs are camelCase, while a couple of nested objects
// (`Me.employee`, `Me.linkedin`) and the PO dashboard's nested payloads are
// snake_case. They are not normalised here on purpose — a mapping layer would
// be one more place for the two to drift, and a field rename in the contract
// should be a compile error, not a silent `undefined` at runtime.

export type AmplifyRole =
  | "amplify_po"
  | "amplify_marketing"
  | "amplify_slt"
  | "amplify_admin";

export type ConnectionStatus =
  | "ACTIVE"
  | "EXPIRING"
  | "NEEDS_RECONNECT"
  | "REMOVED"
  | "NOT_CONNECTED";

export interface AmplifyEmployee {
  employee_id: string;
  email: string;
  display_name: string;
}

export interface AmplifyLinkedIn {
  status: ConnectionStatus;
  expires_at?: string;
}

export interface AmplifyMe {
  employee: AmplifyEmployee;
  roles: AmplifyRole[];
  capabilities: string[];
  linkedin: AmplifyLinkedIn;
}

export type CampaignStatus = "SCHEDULED" | "OPEN" | "CLOSED" | "ARCHIVED";

export interface Campaign {
  id: string;
  provider: string;
  resourceUrn: string;
  resourceType: string;
  ownerUrn: string;
  resourceUrl?: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  categoryCode: string;
  isPriority: boolean;
  tags: string[];
  opensAt: string;
  closesAt: string;
  archivedAt?: string;
  status: CampaignStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CampaignPage {
  items: Campaign[];
  page: number;
  size: number;
  total: number;
}

export interface CampaignDraft {
  resourceUrn: string;
  ownerUrn: string;
  resourceUrl?: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  categoryCode: string;
  isPriority?: boolean;
  tags?: string[];
  opensAt?: string;
  closesAt?: string;
}

/** PATCH body — `version` is required (optimistic locking, ADR-024). */
export interface CampaignPatch extends Partial<Omit<CampaignDraft, "resourceUrn" | "ownerUrn">> {
  version: number;
}

export type CampaignRegistrationRun = "NOT_REQUESTED" | "STARTED" | "DEFERRED";

export interface CampaignRegistration {
  campaign: Campaign;
  run: CampaignRegistrationRun;
}

export interface CategoryRef {
  code: string;
  label: string;
  sortOrder: number;
}

export type ShareKind = "REPOST" | "REPOST_COMMENTARY" | "SHARE" | "SHARE_COMMENTARY";

export type ShareStatus = "QUEUED" | "PUBLISHED" | "FAILED";

export interface Share {
  id: string;
  campaignId: string;
  kind: ShareKind;
  status: ShareStatus;
  failureReason?: string;
  attempts: number;
  requestedAt: string;
  publishedAt?: string;
  failedAt?: string;
  metrics?: Record<string, number>;
}

export interface ShareCommand {
  kind: ShareKind;
  commentary?: string;
}

export interface ConnectStart {
  returnTo?: string;
  pendingCampaignId?: string;
}

export interface ConnectAuthorization {
  authorizationUrl: string;
  state: string;
  expiresAt: string;
}

export interface ConnectComplete {
  code: string;
  state: string;
}

export interface LinkedInConnection {
  status: ConnectionStatus;
  memberUrn: string;
  connectedAt: string;
  expiresAt: string;
  returnTo?: string;
  pendingCampaignId?: string;
}

export type EvidenceProvider = "linkedin" | "medium" | "other";
export type ExternalShareStatus = "PENDING" | "APPROVED" | "REJECTED" | "AMPLIFIED";

export interface ExternalShareClaim {
  evidenceUrl: string;
  certified: boolean;
  campaignId?: string;
}

export interface ExternalShare {
  id: string;
  employeeId: string;
  campaignId?: string;
  action: "OWN_POST";
  evidenceUrl: string;
  evidenceHost: string;
  evidenceProvider: EvidenceProvider;
  status: ExternalShareStatus;
  decidedBy?: string;
  decidedAt?: string;
  decisionReason?: string;
  amplifiedAt?: string;
  createdAt: string;
  version: number;
}

export interface ExternalSharePage {
  items: ExternalShare[];
  page: number;
  size: number;
  total: number;
}

export type PointAction =
  | "REPOST"
  | "REPOST_COMMENTARY"
  | "SHARE"
  | "SHARE_COMMENTARY"
  | "OWN_POST"
  | "OWN_POST_AMPLIFIED";

export interface PointRule {
  id: string;
  action: PointAction;
  points: number;
  effectiveFrom: string;
  createdBy: string;
  createdAt: string;
  inForce: boolean;
}

export interface PointsAdjustment {
  employeeId: string;
  points: number;
  reason: string;
  campaignId?: string;
}

export type LedgerSourceType = "ENGAGEMENT" | "EXTERNAL_SHARE" | "ADJUSTMENT" | "REVERSAL";

export interface LedgerEntry {
  reference: string;
  employeeId: string;
  campaignId?: string;
  sourceType: LedgerSourceType;
  action?: PointAction;
  points: number;
  reason?: string;
  reversesReference?: string;
  actorId: string;
  createdAt: string;
  status?: "HELD" | "PAID";
}

export interface PersonalStanding {
  employeeId: string;
  points?: number;
  rank?: number;
  previousRank?: number;
  pointsToNextRank?: number;
  pointsToTopN?: number;
  inTopN: boolean;
  lastActivityAt?: string;
}

export interface LeaderboardEntry {
  employeeId: string;
  displayName: string;
  email: string;
  points: number;
  rank: number;
  previousRank?: number;
}

export interface TeamEntry {
  employeeId: string;
  displayName: string;
  email: string;
  points: number;
  teamRank: number;
  companyRank: number;
  isMe: boolean;
}

export type TeamStatus = "OK" | "NO_TEAM" | "UNAVAILABLE";

export interface Leaderboard {
  period: string;
  topN: number;
  generatedAt: string;
  company: LeaderboardEntry[];
  me: PersonalStanding;
  myTeam?: { teamName: string; headcount: number; activeCount: number; entries: TeamEntry[] };
  teamStatus: TeamStatus;
}

export interface MyPointsMonthly {
  month: string;
  points: number;
  actions: number;
}

export interface MyPoints {
  period: string;
  standing: PersonalStanding;
  monthly: MyPointsMonthly[];
}

export interface TeamPageEntry {
  employeeId: string;
  displayName: string;
  email: string;
  points: number;
  rank: number;
  teamRank: number;
  previousRank?: number;
  lastActivityAt?: string;
  actions: { canAdjust: boolean; canReverse: boolean };
}

export interface TeamPage {
  period: string;
  scope: "TEAM" | "COMPANY";
  page: number;
  size: number;
  total: number;
  teamStatus: TeamStatus;
  summary: { headcount?: number; activeCount?: number };
  entries: TeamPageEntry[];
}

export interface PointsHistory {
  employeeId: string;
  page: number;
  size: number;
  total: number;
  items: LedgerEntry[];
}

export interface PoDashboard {
  asOf: string;
  month: string;
  reviewQueue: { pending: number; oldestPendingAt?: string; overSla: number; slaHours: number };
  reviewThroughput: {
    windowDays: number;
    approved: number;
    rejected: number;
    amplified: number;
    medianHoursToDecision?: number;
  };
  actionRequired: { count: number };
  points: {
    monthTotal: number;
    allTimeTotal: number;
    byAction: { action: PointAction; points: number; rows: number }[];
  };
  participation: {
    connections: { active: number; expiring: number; needsReconnect: number };
    employeesWithPoints: number;
    activeLast30Days: number;
  };
  campaigns: {
    campaignId: string;
    title: string;
    isPriority: boolean;
    status: CampaignStatus;
    opensAt: string;
    closesAt: string;
    reposters: number;
    externalSharesApproved: number;
    points: number;
    announcement?: string;
  }[];
  shareHealth: {
    windowDays: number;
    queued: number;
    published: number;
    failed: number;
    failedByReason: { reason: string; count: number }[];
  };
  recentCorrections: {
    reference: string;
    type: "ADJUSTMENT" | "REVERSAL";
    employeeId: string;
    email?: string;
    points: number;
    reason?: string;
    actorId: string;
    createdAt: string;
  }[];
}

export type AnnouncementStatus = "QUEUED" | "SENT" | "FAILED";

export interface Announcement {
  campaignId: string;
  status: AnnouncementStatus;
  space: string;
  queuedAt: string;
  sentAt?: string;
  failedAt?: string;
  lastError?: string;
}

export type SchedulerSync = "SYNCED" | "PENDING" | "NOT_CONFIGURED";

/**
 * A setting's value is a raw JSON value, not a string: `PUT /admin/settings`
 * validates it per key (`leaderboard.top_n` must be a JSON int, `run.schedule` a
 * schedule string). Sending the int as a string comes back `INVALID_SETTING`.
 */
export type SettingValue = number | boolean | string;

export interface Setting {
  key: string;
  value: SettingValue;
  version: number;
  updatedBy: string;
  updatedAt: string;
}

export interface SettingList {
  settings: Setting[];
  schedulerSync?: SchedulerSync;
}

export interface SettingChange {
  key: string;
  value: SettingValue;
  version: number;
}

export interface SettingChanges {
  changes: SettingChange[];
}

export interface SchedulerSyncResult {
  schedulerSync: SchedulerSync;
  jobs: { id: string; schedule: string; enabled: boolean; result: string }[];
}

/**
 * The setting keys the Admin screen reads and writes — the contract's own key
 * strings (`amplify-api/constants.bal`; any other key comes back
 * `UNKNOWN_SETTING`). Value kinds, from `settings.bal`:
 * `leaderboard.top_n` int 1–50, `run.schedule` a schedule string (min 60s,
 * default `@every 5m`), `connection.reminder_days` int 1–30,
 * `campaign.default_window_days` int 1–365. Coin settings stay hidden server-side.
 */
export const AMPLIFY_SETTING_KEYS = {
  topN: "leaderboard.top_n",
  runSchedule: "run.schedule",
  reminderDays: "connection.reminder_days",
  campaignDefaultWindow: "campaign.default_window_days",
} as const;

/** RFC-9457 problem `code`s the client branches on — never the `detail`. */
export const AMPLIFY_PROBLEM = {
  evidenceAlreadyClaimed: "EVIDENCE_ALREADY_CLAIMED",
  campaignAlreadyRegistered: "CAMPAIGN_ALREADY_REGISTERED",
  notWso2Resource: "NOT_WSO2_RESOURCE",
  certificationRequired: "CERTIFICATION_REQUIRED",
  invalidEvidenceUrl: "INVALID_EVIDENCE_URL",
  commentaryRequired: "COMMENTARY_REQUIRED",
  linkedinNotConnected: "LINKEDIN_NOT_CONNECTED",
  needsReconnect: "NEEDS_RECONNECT",
  campaignClosed: "CAMPAIGN_CLOSED",
  duplicateAction: "DUPLICATE_ACTION",
  featureDisabled: "FEATURE_DISABLED",
} as const;
