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

import { invoiceSteps, type EngagementAccess } from "./engagementAccess";
import type { WorkQueues } from "../api/engagementTypes";
import { engagementPaths, myEngagementPaths, type EngagementSegment, type InvoicesTab } from "../engagementPaths";

/** The first Finance screen this person may open, in rail order. */
export function firstFinanceScreen(access: EngagementAccess): string {
  if (access.dashboard) return engagementPaths.dashboard;
  if (access.approvals) return engagementPaths.approvals();
  if (access.engagements) return engagementPaths.engagements();
  if (access.allocations) return engagementPaths.allocations();
  if (access.travelRequests) return engagementPaths.travelRequests();
  if (access.invoices) return engagementPaths.invoices();
  if (access.reports) return engagementPaths.reports();
  if (access.visasDocuments) return engagementPaths.documents();
  return engagementPaths.settings();
}

export function myLanding(access: EngagementAccess): string {
  // The order of the Me menu: Allocations, Travels, Passport & Visas.
  if (access.myAllocations) return myEngagementPaths.allocations;
  if (access.myTravelRequests) return myEngagementPaths.travelRequests;
  if (access.myDocuments || access.myVisas) return myEngagementPaths.documents();
  return "/me";
}


/** The Engagements segments this person may open, in order. */
export function engagementSegments(access: EngagementAccess): EngagementSegment[] {
  return [
    ...(access.customerEngagements ? (["customer"] as const) : []),
    ...(access.internalEngagements ? (["internal", "marketing"] as const) : []),
  ];
}

/** One row of tabs: the server's work queues (`/user-info` workQueues), then All Invoices and All Per Diem Payments. */
export function invoiceTabs(access: EngagementAccess, queues?: WorkQueues): InvoicesTab[] {
  if (queues) {
    return [
      ...(queues.invoices.includes("approve-po") ? (["po"] as const) : []),
      ...(queues.invoices.includes("approve") ? (["finance"] as const) : []),
      ...(queues.invoices.includes("push") ? (["push"] as const) : []),
      ...(queues.perDiemPayments.includes("push") ? (["payments-push"] as const) : []),
      ...(queues.netsuiteSyncFailures ? (["sync-failures"] as const) : []),
      ...(queues.invoices.includes("all") ? (["all-invoices"] as const) : []),
      ...(queues.perDiemPayments.includes("all") ? (["all-payments"] as const) : []),
    ];
  }
  const s = invoiceSteps(access.p);
  return [
    ...(s.po ? (["po"] as const) : []),
    ...(s.finance ? (["finance"] as const) : []),
    ...(s.push ? (["push"] as const) : []),
    ...(s.pushPayments ? (["payments-push"] as const) : []),
    ...(s.push || s.pushPayments ? (["sync-failures"] as const) : []),
    ...(access.allInvoices ? (["all-invoices"] as const) : []),
    ...(access.allPayments ? (["all-payments"] as const) : []),
  ];
}
