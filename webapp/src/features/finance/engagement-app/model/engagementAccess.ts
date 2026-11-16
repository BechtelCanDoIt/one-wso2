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

// What the legacy privileges open, per screen.

import type { EngagementTypeId, UserInfo } from "../api/engagementTypes";

/** Allocations app privilege ids. */
export const ALLOC = {
  DASHBOARD: 1,
  CUSTOMER_CREATE: 2,
  CUSTOMER_LIST: 3,
  CUSTOMER_STATUS: 4,
  CUSTOMER_EDIT: 5,
  ALLOCATE_PAID: 6,
  CUSTOMER_COMPLETE: 7,
  CUSTOMER_CONSULTANTS: 8,
  CUSTOMER_ALLOCATIONS: 9,
  CUSTOMER_ALLOCATION_STATUS: 10,
  INTERNAL_CREATE: 11,
  MARKETING_CREATE: 12,
  INTERNAL_LIST: 13,
  INTERNAL_STATUS: 14,
  INTERNAL_EDIT: 15,
  ALLOCATE_INTERNAL: 16,
  INTERNAL_COMPLETE: 17,
  INTERNAL_CONSULTANTS: 18,
  INTERNAL_ALLOCATIONS: 19,
  INTERNAL_ALLOCATION_STATUS: 20,
  TEAM_ALLOCATIONS: 21,
  CONSULTANT_REPORT: 22,
  ROLE_SETTINGS: 23,
  ALLOCATION_TYPES: 25,
  APPROVE_INTERNAL_VIEW: 26,
  APPROVE_INTERNAL_EDIT: 27,
  APPROVE_INTERNAL: 28,
  APPROVE_MARKETING_VIEW: 29,
  APPROVE_MARKETING_EDIT: 30,
  APPROVE_MARKETING: 31,
  ALLOCATE_POST_SALE: 32,
  ALLOCATE_PRE_SALE: 33,
} as const;

/** Travel app privilege ids. */
export const TRAVEL = {
  NEW_REQUESTS: 1,
  ALL_REQUESTS: 2,
  MANAGE_REQUEST: 3,
  EDIT_STATUS: 4,
  EDIT_AGENT: 5,
  EDIT_VISA: 6,
  ADD_VISA: 7,
  VIEW_VISAS: 8,
  VIEW_VISA_INFO: 9,
  EDIT_VISA_RECORD: 10,
  VIEW_DOCUMENTS: 11,
  VIEW_DOCUMENT_INFO: 12,
  EDIT_DOCUMENT: 13,
  ADD_DOCUMENT: 14,
  AGENT_REQUESTS: 18,
  VIEW_PROFILE: 19,
  VIEW_OWN_VISA: 20,
  ADD_OWN_VISA: 21,
  VIEW_OWN_DOCUMENT: 23,
  ADD_OWN_DOCUMENT: 24,
  APP_PREFERENCES: 25,
  ADD_PER_DIEMS: 26,
  DELETE_PER_DIEMS: 27,
  VIEW_PER_DIEMS: 28,
  ROLE_SETTINGS: 29,
  VIEW_INVOICES: 30,
  ADD_INVOICES: 31,
  INVOICE_PO_APPROVAL: 32,
  INVOICE_FINANCE_APPROVAL: 33,
  PUSH_INVOICES: 34,
  VIEW_FUNDING: 35,
  VIEW_OWN_REQUEST: 36,
  VIEW_OWN_PER_DIEMS: 37,
  VIEW_OWN_INVOICES: 38,
  ALL_INVOICES_PAGE: 39,
  PUSH_PAYMENTS: 40,
  ALL_PAYMENTS_PAGE: 41,
  VIEW_PAYMENTS: 42,
  ADD_PAYMENTS: 43,
  EDIT_PAYMENT: 44,
  VIEW_TRAVEL_CARDS: 45,
  ADD_TRAVEL_CARDS: 46,
  VIEW_OWN_PAYMENTS: 47,
  VIEW_OWN_TRAVEL_CARDS: 48,
  MY_TRAVEL_REQUESTS: 49,
} as const;

/** The caller's privileges, one set per legacy app. */
export interface Privileges {
  readonly a: ReadonlySet<number>;
  readonly t: ReadonlySet<number>;
}

export function privilegesOf(info: UserInfo | undefined): Privileges {
  return {
    a: new Set(info?.allocations.privileges ?? []),
    t: new Set(info?.travel.privileges ?? []),
  };
}

const anyOf = (set: ReadonlySet<number>, ...ids: number[]): boolean => ids.some((id) => set.has(id));

/** Every screen-level question the rail and the routes ask, answered once. */
export interface EngagementAccess {
  readonly p: Privileges;
  /** A travel agent: the agency's requests only (Travel 18 without the Travel Team's 1 / 2). */
  readonly isAgent: boolean;
  /** The agent's agency name. */
  readonly agencyName?: string;
  readonly dashboard: boolean;
  readonly approvals: boolean;
  readonly engagements: boolean;
  readonly customerEngagements: boolean;
  readonly internalEngagements: boolean;
  readonly createCustomer: boolean;
  readonly createInternal: boolean;
  readonly createMarketing: boolean;
  readonly allocations: boolean;
  readonly engagementAllocations: boolean;
  readonly teamAllocations: boolean;
  readonly travelRequests: boolean;
  readonly newTravelRequests: boolean;
  readonly invoices: boolean;
  readonly allInvoices: boolean;
  readonly allPayments: boolean;
  readonly reports: boolean;
  readonly consultantReport: boolean;
  readonly visasDocuments: boolean;
  readonly visas: boolean;
  readonly documents: boolean;
  readonly settings: boolean;
  readonly allocationRoles: boolean;
  readonly travelRoles: boolean;
  readonly allocationTypes: boolean;
  readonly myTravelRequests: boolean;
  readonly myDocuments: boolean;
  readonly myVisas: boolean;
  readonly myAllocations: boolean;
  /** Anything at all under Finance → Engagement App. */
  readonly anyFinance: boolean;
  /** Anything at all under Me → Engagement App. */
  readonly anyMe: boolean;
}

/** Whether roles holds group, ignoring the -stg/-dev/-uat suffix of non-production groups. */
const isGroup = (roles: readonly string[] | undefined, group: string): boolean =>
  (roles ?? []).some((r) => r.trim().toLowerCase().replace(/-(stg|dev|uat)$/, "") === group);

export function engagementAccess(info: UserInfo | undefined): EngagementAccess {
  const p = privilegesOf(info);
  const { a, t } = p;
  // `travel.agency` is set for an agent; the privilege rule covers an older /user-info.
  const isAgent = Boolean(info?.travel.agency) || (t.has(TRAVEL.AGENT_REQUESTS) && !anyOf(t, TRAVEL.NEW_REQUESTS, TRAVEL.ALL_REQUESTS));
  const customerEngagements = anyOf(a, ALLOC.CUSTOMER_CREATE, ALLOC.CUSTOMER_LIST, ALLOC.CUSTOMER_ALLOCATIONS);
  const internalEngagements = anyOf(a, ALLOC.INTERNAL_CREATE, ALLOC.MARKETING_CREATE, ALLOC.INTERNAL_LIST, ALLOC.INTERNAL_ALLOCATIONS);
  const engagementAllocations = anyOf(a, ALLOC.CUSTOMER_ALLOCATIONS, ALLOC.INTERNAL_ALLOCATIONS);
  const teamAllocations = a.has(ALLOC.TEAM_ALLOCATIONS);
  // The Invoices & Payments tabs are the server's (`workQueues`), decided with the legacy rules.
  const queues = info?.workQueues;
  const allInvoices = queues ? queues.invoices.includes("all") : t.has(TRAVEL.ALL_INVOICES_PAGE);
  const allPayments = queues ? queues.perDiemPayments.includes("all") : t.has(TRAVEL.ALL_PAYMENTS_PAGE);
  const anyQueue = queues ? queues.invoices.length > 0 || queues.perDiemPayments.length > 0 || queues.netsuiteSyncFailures : false;
  const consultantReport = a.has(ALLOC.CONSULTANT_REPORT);
  const visas = t.has(TRAVEL.VIEW_VISAS);
  const documents = t.has(TRAVEL.VIEW_DOCUMENTS);
  const bothSuperAdmin =
    isGroup(info?.allocations.roles, "app-allocations-admin-super") && isGroup(info?.travel.roles, "app-travel-admin-super");
  const allocationRoles = bothSuperAdmin && a.has(ALLOC.ROLE_SETTINGS);
  const travelRoles = bothSuperAdmin && t.has(TRAVEL.ROLE_SETTINGS);
  const allocationTypes = a.has(ALLOC.ALLOCATION_TYPES);

  const access = {
    p,
    isAgent,
    agencyName: info?.travel.agency?.name,
    // The legacy Allocations Dashboard (privilege 1, every employee); agents get their own.
    dashboard: a.has(ALLOC.DASHBOARD) || isAgent,
    approvals: anyOf(a, ALLOC.APPROVE_INTERNAL_VIEW, ALLOC.APPROVE_MARKETING_VIEW),
    engagements: customerEngagements || internalEngagements,
    customerEngagements,
    internalEngagements,
    createCustomer: a.has(ALLOC.CUSTOMER_CREATE),
    createInternal: a.has(ALLOC.INTERNAL_CREATE),
    createMarketing: a.has(ALLOC.MARKETING_CREATE),
    allocations: engagementAllocations || teamAllocations,
    engagementAllocations,
    teamAllocations,
    travelRequests: anyOf(t, TRAVEL.NEW_REQUESTS, TRAVEL.ALL_REQUESTS, TRAVEL.AGENT_REQUESTS),
    newTravelRequests: t.has(TRAVEL.NEW_REQUESTS),
    invoices: allInvoices || allPayments || anyQueue,
    allInvoices,
    allPayments,
    reports: consultantReport || t.has(TRAVEL.ALL_INVOICES_PAGE) || t.has(TRAVEL.ALL_PAYMENTS_PAGE),
    consultantReport,
    visasDocuments: visas || documents,
    visas,
    documents,
    settings: allocationRoles || travelRoles || allocationTypes,
    allocationRoles,
    travelRoles,
    allocationTypes,
    myTravelRequests: anyOf(t, TRAVEL.MY_TRAVEL_REQUESTS, TRAVEL.VIEW_OWN_REQUEST),
    myDocuments: t.has(TRAVEL.VIEW_OWN_DOCUMENT),
    myVisas: t.has(TRAVEL.VIEW_OWN_VISA),
    // Own allocations are new in Release 1 (read-only); every employee holds Allocations 1.
    myAllocations: a.has(ALLOC.DASHBOARD) || t.has(TRAVEL.MY_TRAVEL_REQUESTS),
  };
  return {
    ...access,
    anyFinance:
      access.dashboard ||
      access.approvals ||
      access.engagements ||
      access.allocations ||
      access.travelRequests ||
      access.invoices ||
      access.reports ||
      access.visasDocuments ||
      access.settings,
    anyMe: access.myTravelRequests || access.myDocuments || access.myVisas || access.myAllocations,
  };
}

// ---------------------------------------------------------------------------
// Action-level rules, as the legacy screens checked them.

const PAID_TYPES: readonly EngagementTypeId[] = [2, 6, 7];

export const isPaidType = (typeId: EngagementTypeId): boolean => PAID_TYPES.includes(typeId);

/** The legacy allocate check, both halves: the type rule (33 pre sale, 32 post sale, 6 the retired Paid type, 16 internal and events) and the Allocate page's own reads, which accept only 6, 16 or 21. */
export function canAllocateType(p: Privileges, typeId: EngagementTypeId): boolean {
  const pageReads = anyOf(p.a, ALLOC.ALLOCATE_PAID, ALLOC.ALLOCATE_INTERNAL, ALLOC.TEAM_ALLOCATIONS);
  if (!pageReads) return false;
  if (typeId === 4 || typeId === 6) return p.a.has(ALLOC.ALLOCATE_POST_SALE);
  if (typeId === 3 || typeId === 7) return p.a.has(ALLOC.ALLOCATE_PRE_SALE);
  if (typeId === 2) return p.a.has(ALLOC.ALLOCATE_PAID);
  return p.a.has(ALLOC.ALLOCATE_INTERNAL);
}

export const isCustomerType = (typeId: EngagementTypeId): boolean => typeId !== 1 && typeId !== 5;

/** Edit an approved engagement: 5 customer, 15 internal and events. */
export const canEditEngagement = (p: Privileges, typeId: EngagementTypeId): boolean =>
  p.a.has(isCustomerType(typeId) ? ALLOC.CUSTOMER_EDIT : ALLOC.INTERNAL_EDIT);

/** Mark as Completed / Reopen the request: 7 customer, 17 internal and events. */
export const canCompleteEngagement = (p: Privileges, typeId: EngagementTypeId): boolean =>
  p.a.has(isCustomerType(typeId) ? ALLOC.CUSTOMER_COMPLETE : ALLOC.INTERNAL_COMPLETE);

/** Change Engagement Status: 4 customer, 14 internal and events. */
export const canSetEngagementStatus = (p: Privileges, typeId: EngagementTypeId): boolean =>
  p.a.has(isCustomerType(typeId) ? ALLOC.CUSTOMER_STATUS : ALLOC.INTERNAL_STATUS);

/** Update Allocation Status: internal needs 20; customer follows the allocate rule (10 is never checked). */
export const canEditAllocationStatus = (p: Privileges, typeId: EngagementTypeId): boolean =>
  isCustomerType(typeId) ? canAllocateType(p, typeId) : p.a.has(ALLOC.INTERNAL_ALLOCATION_STATUS);

// Saving an edit or an approval is a PATCH the backend accepts with 4, 14, 7, 17 or 5.
const patchAllowed = (p: Privileges): boolean =>
  anyOf(p.a, ALLOC.CUSTOMER_STATUS, ALLOC.INTERNAL_STATUS, ALLOC.CUSTOMER_COMPLETE, ALLOC.INTERNAL_COMPLETE, ALLOC.CUSTOMER_EDIT);

/** Edit while Pending Approval: 27 internal, 30 marketing, with a PATCH privilege. */
export const canEditPending = (p: Privileges, typeId: EngagementTypeId): boolean =>
  patchAllowed(p) && (typeId === 5 ? p.a.has(ALLOC.APPROVE_MARKETING_EDIT) : typeId === 1 && p.a.has(ALLOC.APPROVE_INTERNAL_EDIT));

/** Approve: the legacy page checks 28 on both tabs, with a PATCH privilege. */
export const canApprove = (p: Privileges, typeId: EngagementTypeId): boolean =>
  patchAllowed(p) && (typeId === 1 || typeId === 5) && p.a.has(ALLOC.APPROVE_INTERNAL);

/** Invoice steps the caller acts on. The finance step is for Finance Approval without HR (PO) Approval, as in the Travel app. */
export function invoiceSteps(p: Privileges): { po: boolean; finance: boolean; push: boolean; pushPayments: boolean } {
  return {
    po: p.t.has(TRAVEL.INVOICE_PO_APPROVAL),
    finance: p.t.has(TRAVEL.INVOICE_FINANCE_APPROVAL) && !p.t.has(TRAVEL.INVOICE_PO_APPROVAL),
    push: p.t.has(TRAVEL.PUSH_INVOICES),
    pushPayments: p.t.has(TRAVEL.PUSH_PAYMENTS),
  };
}
