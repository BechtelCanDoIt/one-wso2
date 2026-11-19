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

// Every Engagement App URL, built in one place.

export const ENGAGEMENT_APP_PATH = "/finance/engagement-app";

export type EngagementSegment = "customer" | "internal" | "marketing";
export type EngagementTab = "allocations" | "details";
export type ApprovalSegment = "internal" | "marketing";
export type AllocationsSegment = "engagement" | "team";
export type TravelSegment = "new" | "in-progress" | "completed" | "all";
export type TravelTab = "info" | "per-diems" | "invoices" | "travel-cards" | "payments";
export type InvoicesTab =
  | "po"
  | "finance"
  | "push"
  | "payments-push"
  | "sync-failures"
  | "all-invoices"
  | "all-payments";
export type ReportsTab = "consultant-allocations" | "invoices" | "per-diem-payments";
export type DocumentsTab = "visas" | "documents";
export type SettingsTab = "allocation-roles" | "travel-roles" | "allocation-types";

const withQuery = (path: string, query?: Record<string, string | undefined>): string => {
  if (!query) return path;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
};

const A = ENGAGEMENT_APP_PATH;

export const engagementPaths = {
  home: A,
  dashboard: `${A}/dashboard`,
  approvals: (segment?: ApprovalSegment): string => (segment ? `${A}/approvals/${segment}` : `${A}/approvals`),
  engagements: (segment?: EngagementSegment, query?: Record<string, string | undefined>): string =>
    withQuery(segment ? `${A}/engagements/${segment}` : `${A}/engagements`, query),
  newEngagement: (kind: "customer" | "internal", type?: 1 | 5): string =>
    withQuery(`${A}/engagements/new/${kind}`, { type: type ? String(type) : undefined }),
  engagement: (id: string, tab: EngagementTab = "allocations"): string =>
    `${A}/engagements/${encodeURIComponent(id)}/${tab}`,
  editEngagement: (id: string, pending = false): string =>
    pending ? `${A}/approvals/edit/${encodeURIComponent(id)}` : `${A}/engagements/${encodeURIComponent(id)}/edit`,
  allocate: (id: string): string => `${A}/engagements/${encodeURIComponent(id)}/allocate`,
  allocations: (segment?: AllocationsSegment, query?: Record<string, string | undefined>): string =>
    withQuery(segment ? `${A}/allocations/${segment}` : `${A}/allocations`, query),
  travelRequests: (segment?: TravelSegment, query?: Record<string, string | undefined>): string =>
    withQuery(segment ? `${A}/travel-requests/${segment}` : `${A}/travel-requests`, query),
  travelRequest: (jobNumber: string, tab: TravelTab = "info"): string =>
    `${A}/travel-requests/${encodeURIComponent(jobNumber)}/${tab}`,
  invoices: (tab?: InvoicesTab): string => (tab ? `${A}/invoices/${tab}` : `${A}/invoices`),
  reports: (tab?: ReportsTab): string => (tab ? `${A}/reports/${tab}` : `${A}/reports`),
  documents: (tab?: DocumentsTab): string => (tab ? `${A}/visas-documents/${tab}` : `${A}/visas-documents`),
  settings: (tab?: SettingsTab): string => (tab ? `${A}/settings/${tab}` : `${A}/settings`),
} as const;

/** The person's own Engagement App screens, under Me. */
export const myEngagementPaths = {
  travelRequests: "/me/travel-requests",
  travelRequest: (jobNumber: string, tab: TravelTab = "info"): string =>
    `/me/travel-requests/${encodeURIComponent(jobNumber)}/${tab}`,
  documents: (tab?: DocumentsTab): string => (tab ? `/me/passport-visas/${tab}` : "/me/passport-visas"),
  allocations: "/me/allocations",
} as const;
