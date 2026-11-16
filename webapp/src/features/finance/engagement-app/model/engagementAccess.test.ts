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

import { describe, expect, it } from "vitest";
import type { UserInfo } from "../api/engagementTypes";
import {
  ALLOC,
  TRAVEL,
  canAllocateType,
  canApprove,
  canEditAllocationStatus,
  canEditPending,
  engagementAccess,
  invoiceSteps,
  privilegesOf,
} from "./engagementAccess";

const user = (allocations: number[], travel: number[] = []): UserInfo => ({
  email: "jane@wso2.com",
  allocations: { privileges: allocations },
  travel: { privileges: travel },
});

describe("privilege numbers stay with the app that issued them", () => {
  it("reads Allocations 1 as the Dashboard and never as New Travel Requests", () => {
    const a = engagementAccess(user([ALLOC.DASHBOARD]));
    expect(a.dashboard).toBe(true);
    expect(a.newTravelRequests).toBe(false);
    expect(a.travelRequests).toBe(false);
  });

  it("reads Travel 1 as New Travel Requests and never as the Dashboard", () => {
    const a = engagementAccess(user([], [TRAVEL.NEW_REQUESTS]));
    expect(a.newTravelRequests).toBe(true);
    expect(a.dashboard).toBe(false);
  });

  it("gives nothing to someone with no privileges, and nothing before /user-info answers", () => {
    for (const a of [engagementAccess(user([], [])), engagementAccess(undefined)]) {
      expect(a.anyFinance).toBe(false);
      expect(a.anyMe).toBe(false);
    }
  });
});

describe("who sees what", () => {
  it("an employee (wso2-employees) sees the Dashboard and their own pages", () => {
    const a = engagementAccess(user([1], [19, 20, 21, 23, 24, 36, 37, 38, 47, 48, 49]));
    expect(a.dashboard).toBe(true);
    expect(a.engagements || a.allocations || a.invoices || a.settings).toBe(false);
    expect([a.myTravelRequests, a.myDocuments, a.myVisas, a.myAllocations]).toEqual([true, true, true, true]);
  });

  it("a travel agent sees the agency's dashboard and travel requests, nothing of anyone's engagements", () => {
    const a = engagementAccess(user([], [3, 4, 6, 18, 26, 27, 28, 30, 31, 45, 46]));
    expect(a.isAgent).toBe(true);
    expect(a.dashboard).toBe(true);
    expect(a.travelRequests).toBe(true);
    expect(a.engagements || a.allocations || a.invoices || a.reports).toBe(false);
    expect(a.anyMe).toBe(false);
  });

  it("the Travel Team is not an agent: it holds the All / New Travel Requests pages", () => {
    const a = engagementAccess(user([1], [1, 2, 3, 4, 5, 6, 18]));
    expect(a.isAgent).toBe(false);
    expect(a.newTravelRequests).toBe(true);
  });

  it("each Settings tab follows its own privilege", () => {
    expect(engagementAccess(user([ALLOC.ALLOCATION_TYPES])).allocationTypes).toBe(true);
    expect(engagementAccess(user([ALLOC.ALLOCATION_TYPES])).allocationRoles).toBe(false);
    expect(engagementAccess(user([], [TRAVEL.ROLE_SETTINGS])).travelRoles).toBe(false);
  });

  it("the role tabs need both super admin groups", () => {
    const both: UserInfo = {
      email: "jane@wso2.com",
      allocations: { privileges: [ALLOC.ROLE_SETTINGS], roles: ["app-allocations-admin-super-stg"] },
      travel: { privileges: [TRAVEL.ROLE_SETTINGS], roles: ["app-travel-admin-super-stg"] },
    };
    expect(engagementAccess(both).allocationRoles).toBe(true);
    expect(engagementAccess(both).travelRoles).toBe(true);
    const oneGroup: UserInfo = { ...both, travel: { privileges: [TRAVEL.ROLE_SETTINGS], roles: [] } };
    expect(engagementAccess(oneGroup).allocationRoles).toBe(false);
    expect(engagementAccess(oneGroup).travelRoles).toBe(false);
    expect(engagementAccess(oneGroup).settings).toBe(false);
  });
});

describe("the legacy action rules", () => {
  it("a pre-sale or post-sale group alone cannot allocate: the Allocate page's reads need 6, 16 or 21", () => {
    expect(canAllocateType(privilegesOf(user([ALLOC.ALLOCATE_PRE_SALE])), 3)).toBe(false);
    expect(canAllocateType(privilegesOf(user([ALLOC.ALLOCATE_POST_SALE])), 4)).toBe(false);
  });

  it("with the page's reads, 33 allocates on pre sale and 32 on post sale, and not the other way round", () => {
    const pre = privilegesOf(user([ALLOC.ALLOCATE_PAID, ALLOC.ALLOCATE_PRE_SALE]));
    expect(canAllocateType(pre, 3)).toBe(true);
    expect(canAllocateType(pre, 7)).toBe(true);
    expect(canAllocateType(pre, 4)).toBe(false);
    expect(canAllocateType(pre, 6)).toBe(false);
  });

  it("16 allocates on internal engagements and marketing events", () => {
    const p = privilegesOf(user([ALLOC.ALLOCATE_INTERNAL]));
    expect(canAllocateType(p, 1)).toBe(true);
    expect(canAllocateType(p, 5)).toBe(true);
    expect(canAllocateType(p, 3)).toBe(false);
  });

  it("an approver group on its own cannot approve: the PATCH also needs 4, 14, 7, 17 or 5", () => {
    expect(canApprove(privilegesOf(user([26, 27, 28])), 1)).toBe(false);
    expect(canApprove(privilegesOf(user([26, 27, 28, ALLOC.INTERNAL_STATUS])), 1)).toBe(true);
  });

  it("approving a marketing event checks 28, as the legacy page does; 31 alone is never enough", () => {
    expect(canApprove(privilegesOf(user([29, 30, 31, ALLOC.INTERNAL_STATUS])), 5)).toBe(false);
    expect(canApprove(privilegesOf(user([28, ALLOC.INTERNAL_STATUS])), 5)).toBe(true);
  });

  it("editing a pending event needs 30, a pending internal engagement 27", () => {
    const p = privilegesOf(user([30, ALLOC.INTERNAL_STATUS]));
    expect(canEditPending(p, 5)).toBe(true);
    expect(canEditPending(p, 1)).toBe(false);
  });

  it("an internal allocation's status needs 20; a customer one follows the allocate rule (10 is never checked)", () => {
    expect(canEditAllocationStatus(privilegesOf(user([20])), 1)).toBe(true);
    expect(canEditAllocationStatus(privilegesOf(user([10])), 3)).toBe(false);
  });

  it("the finance invoice step is for Finance Approval without HR (PO) Approval", () => {
    expect(invoiceSteps(privilegesOf(user([], [32, 33]))).finance).toBe(false);
    expect(invoiceSteps(privilegesOf(user([], [33]))).finance).toBe(true);
    expect(invoiceSteps(privilegesOf(user([], [32]))).po).toBe(true);
  });
});

describe("Invoices & Payments without workQueues", () => {
  it("keeps a PO approver on the same rule as the PO tab", () => {
    const a = engagementAccess(user([], [TRAVEL.INVOICE_PO_APPROVAL]));
    expect(invoiceSteps(a.p).po).toBe(true);
    expect(a.invoices).toBe(true);
    expect(a.anyFinance).toBe(true);
  });
});
