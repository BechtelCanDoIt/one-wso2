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
import type { Person } from "../types";
import type { BackendRequestDetail } from "./backendTypes";
import { toBudgetApprovers, toChoices, toEngagementChoices, toMe, toRequest, toSummary } from "./backendMapping";

const signedIn: Person = { id: "me@example.com", name: "Me Myself", email: "me@example.com" };

const detail = (patch: Partial<BackendRequestDetail> = {}): BackendRequestDetail => ({
  id: 5,
  referenceNo: "PR-2026-00005",
  title: "Figma",
  category: "IT",
  status: "PENDING_APPROVAL",
  version: 2,
  submittedOn: "2026-11-02T08:00:00Z",
  updatedOn: "2026-11-02T08:00:00Z",
  createdOn: "2026-11-01T08:00:00Z",
  requesterName: "Me Myself",
  requesterEmail: "me@example.com",
  requirementDetails: "Design tool for the UX team.",
  vendorName: "Figma Inc",
  budgetCategoryCode: "CAT-1",
  businessUnitCode: "BU-2",
  productCode: null,
  regionCode: "REG-3",
  engagementCode: "ENG-1",
  budgetApproverId: 10,
  budgetApproverName: "Budget Owner",
  teamLeadEmail: "lead@example.com",
  additionalApprovers: ["other@example.com"],
  itDetails: { softwareName: "Figma" },
  saasDetails: null,
  decisions: [],
  ...patch,
});

describe("backend mapping", () => {
  it("turns a summary row into the UI's, with a string id and the UI's names for category and status", () => {
    expect(
      toSummary({ id: 7, referenceNo: null, title: "T", category: "NON_IT", status: "DRAFT", version: 1, submittedOn: null, updatedOn: "2026-11-01T00:00:00Z" }),
    ).toEqual({ id: "7", reference: null, title: "T", category: "NON-IT", status: "draft", submittedAt: null, updatedAt: "2026-11-01T00:00:00Z" });
  });

  it.each([
    ["PENDING_APPROVAL", "submitted"],
    ["APPROVED", "approved"],
    ["REJECTED", "rejected"],
    ["ASSIGNED", "assigned"],
    ["CANCELLED", "cancelled"],
    ["DRAFT", "draft"],
  ] as const)("reads status %s as %s", (backend, ui) => {
    expect(toRequest(detail({ status: backend })).status).toBe(ui);
  });

  it("reads Marketing & Events as its own category", () => {
    expect(toRequest(detail({ category: "MARKETING_EVENTS" })).category).toBe("EVENTS");
  });

  it("maps a detail: codes stay codes, the team lead is named by email, and what has no field stays empty", () => {
    const r = toRequest(detail());
    expect(r).toMatchObject({
      id: "5",
      reference: "PR-2026-00005",
      requester: { name: "Me Myself", email: "me@example.com" },
      teamLead: { email: "lead@example.com", name: "lead@example.com" },
      additionalApprovers: ["other@example.com"],
      budget: { category: "CAT-1", businessUnit: "BU-2", product: "", region: "REG-3", engagementCode: "ENG-1" },
      budgetApproverId: "10",
      budgetApproverName: "Budget Owner",
      vendors: [{ name: "Figma Inc" }],
      notes: "",
      attachments: [],
    });
    expect(r.details).toMatchObject({ description: "Design tool for the UX team.", product: "Figma", plan: "", roi: "" });
  });

  it("has no team lead, vendor or budget approver when the backend names none", () => {
    const r = toRequest(detail({ teamLeadEmail: null, vendorName: null, budgetApproverId: null, budgetApproverName: null }));
    expect(r.teamLead).toBeNull();
    expect(r.vendors).toEqual([]);
    expect(r.budgetApproverId).toBe("");
  });

  it("reads the SaaS answers into the assessment, and nothing when there are none", () => {
    expect(toRequest(detail()).details.sensitiveData).toBe("");
    const saas = toRequest(
      detail({
        saasDetails: {
          adminCount: 2,
          adminDetails: "IT team",
          userCount: 40,
          userDetails: "Design team",
          handlesSensitiveData: false,
          handlesExternalPii: true,
          externalPiiDetails: "Customer names",
          handlesEmployeePii: false,
          integratesInternalSystems: true,
          integrationDetails: "Google Workspace SSO",
          vendorDocsLinks: "https://docs.example.com",
        },
      }),
    ).details;
    expect(saas).toMatchObject({
      userCount: "40",
      adminCount: "2",
      sensitiveData: "no",
      externalPii: "yes",
      externalPiiDetail: "Customer names",
      employeePii: "no",
      integrates: "yes",
      integrations: [{ system: "Google Workspace SSO", data: "" }],
      vendorDocs: "yes",
      vendorDocsLink: "https://docs.example.com",
    });
  });

  it("shows the decision on the version being read, and ignores an older version's", () => {
    const decisions = [
      { version: 1, decidedBy: "lead@example.com", decision: "REJECTED" as const, isOverride: false, comment: "Get a second quote.", justification: null, decidedOn: "2026-10-30T10:00:00Z" },
    ];
    expect(toRequest(detail({ version: 1, status: "REJECTED", decisions })).teamLeadDecision).toEqual({
      decision: "rejected",
      notes: "Get a second quote.",
      decidedAt: "2026-10-30T10:00:00Z",
      decidedBy: "lead@example.com",
      isOverride: false,
    });
    expect(toRequest(detail({ version: 2, decisions })).teamLeadDecision.decision).toBe("pending");
  });

  it("shows a Procurement override as the decision when it is the latest, and says who made it", () => {
    const decisions = [
      { version: 2, decidedBy: "lead@example.com", decision: "APPROVED" as const, isOverride: false, comment: null, justification: null, decidedOn: "2026-11-03T10:00:00Z" },
      { version: 2, decidedBy: "admin@example.com", decision: "REJECTED" as const, isOverride: true, comment: "Over budget.", justification: "Budget exceeded", decidedOn: "2026-11-04T10:00:00Z" },
    ];
    expect(toRequest(detail({ decisions })).teamLeadDecision).toMatchObject({
      decision: "rejected",
      decidedBy: "admin@example.com",
      isOverride: true,
    });
  });

  it("leaves an assessment answer unanswered when the backend omits it, and reads only an explicit true or false as Yes or No", () => {
    const saas = { adminCount: 1, adminDetails: "IT", userCount: 5, userDetails: "Team" };
    expect(toRequest(detail({ saasDetails: saas })).details).toMatchObject({
      sensitiveData: "",
      externalPii: "",
      employeePii: "",
      integrates: "",
    });
    expect(toRequest(detail({ saasDetails: { ...saas, handlesSensitiveData: false, handlesExternalPii: true } })).details).toMatchObject({
      sensitiveData: "no",
      externalPii: "yes",
      employeePii: "",
    });
  });

  it("builds the signed-in user from the token and the backend's roles and team lead", () => {
    expect(toMe({ email: "me@example.com", roles: ["procurement_user"] }, { approvalExempt: false, teamLead: { email: "lead@example.com", name: "Lead" } }, signedIn)).toMatchObject({
      name: "Me Myself",
      roles: ["procurement_user"],
      teamLead: { name: "Lead", email: "lead@example.com" },
      approvalExempt: false,
    });
    expect(toMe({ email: "me@example.com", roles: [] }, { approvalExempt: true }, signedIn)).toMatchObject({ teamLead: null, approvalExempt: true });
  });

  it("turns lists into choices, an engagement as code and name, and approver ids into strings", () => {
    expect(toChoices([{ code: "BU-1", label: "Sales" }])).toEqual([{ value: "BU-1", label: "Sales" }]);
    expect(toEngagementChoices([{ code: "E1", name: "Platform" }, { code: "E2", name: "E2" }])).toEqual([
      { value: "E1", label: "E1 - Platform" },
      { value: "E2", label: "E2" },
    ]);
    expect(toBudgetApprovers([{ id: 10, name: "Budget Owner" }])).toEqual([{ id: "10", name: "Budget Owner" }]);
  });
});
