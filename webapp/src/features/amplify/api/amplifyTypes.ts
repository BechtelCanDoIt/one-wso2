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

// Wire shapes from amplify-api's OpenAPI (marketing-tools apps/amplify/amplify-api/openapi.yaml).
// Only the fields these screens read are typed; the rest pass through untouched.

export type AmplifyRole = "amplify_po" | "amplify_marketing" | "amplify_slt" | "amplify_admin";

export type LinkedInStatus = "ACTIVE" | "EXPIRING" | "NEEDS_RECONNECT" | "REMOVED" | "NOT_CONNECTED";

export interface AmplifyMe {
  employee: { employee_id: string; email: string; display_name: string };
  roles: AmplifyRole[];
  capabilities: string[];
  linkedin: { status: LinkedInStatus; expires_at?: string | null };
}

export type CampaignStatus = "SCHEDULED" | "OPEN" | "CLOSED" | "ARCHIVED";

export interface Campaign {
  id: string;
  resourceUrn: string;
  resourceUrl?: string | null;
  title: string;
  summary?: string | null;
  imageUrl?: string | null;
  categoryCode: string;
  isPriority: boolean;
  tags: string[];
  opensAt: string;
  closesAt: string;
  status: CampaignStatus;
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
  isPriority: boolean;
  closesAt?: string;
}

export interface CampaignPatch {
  version: number;
  title?: string;
  summary?: string;
  imageUrl?: string;
  categoryCode?: string;
  isPriority?: boolean;
  closesAt?: string;
}

export interface CampaignRegistration {
  campaign: Campaign;
  run: "NOT_REQUESTED" | "STARTED" | "DEFERRED";
}

export interface Category {
  code: string;
  label: string;
  sortOrder: number;
}

// Phase 1 shares as a plain SHARE only: commentary and the REPOST kinds aren't
// supported by the LinkedIn API Amplify uses yet (D5 spike).
export type ShareKind = "SHARE";

export interface Share {
  id: string;
  campaignId: string;
  status: "QUEUED" | "PUBLISHED" | "FAILED";
}

export interface LeaderboardEntry {
  employeeId: string;
  displayName: string;
  email: string;
  points: number;
  rank: number;
}

export interface PersonalStanding {
  employeeId: string;
  points?: number | null;
  rank?: number | null;
  pointsToNextRank?: number | null;
  pointsToTopN?: number | null;
  inTopN: boolean;
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

export interface Leaderboard {
  topN: number;
  company: LeaderboardEntry[];
  me: PersonalStanding;
  myTeam?: { teamName: string; headcount: number; activeCount: number; entries: TeamEntry[] } | null;
  teamStatus: "OK" | "NO_TEAM" | "UNAVAILABLE";
}

export interface ConnectAuthorization {
  authorizationUrl: string;
  state: string;
  expiresAt: string;
}

export interface LinkedInConnection {
  status: LinkedInStatus;
  returnTo?: string | null;
  pendingCampaignId?: string | null;
}

/** RFC 9457 body every amplify-api error carries. The client branches on `code`, never `detail`. */
export interface AmplifyProblem {
  code: string;
  title: string;
  status: number;
  detail?: string | null;
}
