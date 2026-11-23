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

// Registry of the Engagement App (the legacy Allocations and Travel apps): a group under Finance for the work done on other people's engagements and trips, and top-level rows under Me for the person's own.

import {
  BriefcaseBusinessIcon,
  BriefcaseIcon,
  CalendarRangeIcon,
  IdCardIcon,
  InboxIcon,
  LayoutDashboardIcon,
  PlaneIcon,
  ReceiptIcon,
  SettingsIcon,
  StampIcon,
  TableIcon,
  UsersIcon,
} from "@wso2/oxygen-ui-icons-react";
import type { MenuApp } from "@constants/appMenu";
import { engagementPaths, myEngagementPaths } from "@features/finance/engagement-app/engagementPaths";

/** The Finance group's id, as appsToSections names it. */
export const ENGAGEMENT_GROUP_ID = "sec-app-engagement-app";

export const ENGAGEMENT_ITEM = {
  dashboard: "finance-ea-dashboard",
  approvals: "finance-ea-approvals",
  engagements: "finance-ea-engagements",
  allocations: "finance-ea-allocations",
  travelRequests: "finance-ea-travel-requests",
  invoices: "finance-ea-invoices",
  reports: "finance-ea-reports",
  visas: "finance-ea-visas",
  settings: "finance-ea-settings",
  myTravelRequests: "me-ea-travel-requests",
  myDocuments: "me-ea-passport-visas",
  myAllocations: "me-ea-allocations",
} as const;

export const ENGAGEMENT_APPS: readonly MenuApp[] = [
  {
    key: "engagement-app",
    name: "Engagement App",
    icon: BriefcaseBusinessIcon,
    purpose: "Engagements, allocations and travel: approve, allocate, book and pay.",
    // A person who can open only one row (a travel agent, an employee with only
    // the Dashboard) still sees it under Engagement App.
    alwaysGroup: true,
    wrapLabels: true,
    items: [
      { id: ENGAGEMENT_ITEM.dashboard, label: "Dashboard", icon: LayoutDashboardIcon, desc: "Where engagements, allocations and travel stand today.", requires: ["admin"], path: engagementPaths.dashboard },
      { id: ENGAGEMENT_ITEM.approvals, label: "Approvals", icon: InboxIcon, desc: "Internal engagements and marketing events waiting for approval.", requires: ["admin"], path: engagementPaths.approvals() },
      { id: ENGAGEMENT_ITEM.engagements, label: "Engagements", icon: BriefcaseIcon, desc: "Customer engagements, internal engagements and marketing events.", requires: ["admin"], path: engagementPaths.engagements() },
      { id: ENGAGEMENT_ITEM.allocations, label: "Allocations", icon: UsersIcon, desc: "Engagement allocations and team allocations.", requires: ["admin"], path: engagementPaths.allocations() },
      { id: ENGAGEMENT_ITEM.travelRequests, label: "Travel Requests", icon: PlaneIcon, desc: "Travel requests from confirmed allocations.", requires: ["admin"], path: engagementPaths.travelRequests() },
      { id: ENGAGEMENT_ITEM.invoices, label: "Invoices & Payments", icon: ReceiptIcon, desc: "Travel invoices and per diem payments, with their approval and NetSuite status.", requires: ["admin"], path: engagementPaths.invoices() },
      { id: ENGAGEMENT_ITEM.reports, label: "Reports", icon: TableIcon, desc: "Consultant allocations, travel invoices and per diem payments, with Export CSV.", requires: ["admin"], path: engagementPaths.reports() },
      { id: ENGAGEMENT_ITEM.visas, label: "Visas & Documents", icon: StampIcon, desc: "Employees' visas and travel documents.", requires: ["admin"], path: engagementPaths.documents() },
      { id: ENGAGEMENT_ITEM.settings, label: "Preferences", icon: SettingsIcon, desc: "Role privileges and allocation types.", requires: ["admin"], path: engagementPaths.settings() },
    ],
  },
];

export const MY_ENGAGEMENT_APPS: readonly MenuApp[] = [
  {
    key: "my-engagement-app",
    name: "Engagement App",
    icon: BriefcaseBusinessIcon,
    purpose: "Your travel requests, passport and visas, and allocations.",
    items: [
      { id: ENGAGEMENT_ITEM.myTravelRequests, label: "My Travels", icon: PlaneIcon, desc: "Your travels, with their per diems, invoices and payments.", requires: ["admin"], path: myEngagementPaths.travelRequests },
      { id: ENGAGEMENT_ITEM.myDocuments, label: "Passport & Visas", icon: IdCardIcon, desc: "Your passport, other travel documents and visas.", requires: ["admin"], path: myEngagementPaths.documents() },
      { id: ENGAGEMENT_ITEM.myAllocations, label: "My Allocations", icon: CalendarRangeIcon, desc: "Where you are allocated, and when.", requires: ["admin"], path: myEngagementPaths.allocations },
    ],
  },
];

/** Every Engagement App rail id, the Finance group included, for the `engagement` adapter. */
export const ENGAGEMENT_ITEM_IDS: ReadonlySet<string> = new Set([
  ENGAGEMENT_GROUP_ID,
  ...ENGAGEMENT_APPS.flatMap((app) => app.items.map((it) => it.id)),
  ...MY_ENGAGEMENT_APPS.flatMap((app) => app.items.map((it) => it.id)),
]);
