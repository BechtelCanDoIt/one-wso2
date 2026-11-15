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

// SAMPLE DATA ONLY, served in dev builds while the Procurement backend is not
// configured (see isProcurementMockActive), and used for submitting while that
// is not connected. Held in memory, so a reload starts over; nothing is written
// to browser storage. It follows the backend's rules where the screens meet
// them: an additional approver is never the requester or the team lead, and
// only a rejected request is edited.

import type {
  BudgetApproverOption,
  Choice,
  Person,
  ProcurementLookups,
  ProcurementMe,
  PurchaseRequest,
  PurchaseRequestInput,
} from "../types";
import { emptyDetails } from "../request-form/requestFormModel";
import type { ProcurementApi } from "./procurementApi";

const person = (name: string, email: string): Person => ({ id: email, name, email });

// Sample people, lists and vendors.
export const MOCK_DIRECTORY: readonly Person[] = [
  person("Alex Morgan", "alex.morgan@example.com"),
  person("Blake Rivers", "blake.rivers@example.com"),
  person("Casey Lane", "casey.lane@example.com"),
  person("Drew Parker", "drew.parker@example.com"),
  person("Emery Quinn", "emery.quinn@example.com"),
  person("Finley Brooks", "finley.brooks@example.com"),
  person("Legal Reviewer", "legal.reviewer@example.com"),
  person("Security Reviewer", "security.reviewer@example.com"),
  person("Compliance Reviewer", "compliance.reviewer@example.com"),
  person("Budget Owner", "budget.owner@example.com"),
  person("Jordan Ellis", "jordan.ellis@example.com"),
];

const TEAM_LEAD = MOCK_DIRECTORY[10];

/** A pick list where each label also has a code, as the backend serves them. */
const choices = (prefix: string, labels: string[]): Choice[] =>
  labels.map((label, index) => ({ value: `${prefix}-${index + 1}`, label }));

const MOCK_LOOKUPS: ProcurementLookups = {
  budgetCategories: choices("CAT", [
    "Software & Subscriptions",
    "Hardware & Equipment",
    "Cloud & Hosting",
    "Professional Services",
    "Marketing & Events",
    "Facilities & Office",
    "HR & People",
    "Travel & Accommodation",
    "Insurance",
    "Other",
  ]),
  businessUnits: choices("BU", [
    "Finance",
    "Engineering - Platform",
    "Marketing",
    "Sales",
    "People Operations",
    "Facilities & Admin",
    "Legal",
    "Customer Success",
  ]),
  products: choices("PRD", [
    "WSO2 API Manager",
    "WSO2 Identity Server",
    "WSO2 MI / Integration",
    "Choreo",
    "Asgardeo",
    "Ballerina",
    "Cross-product / Platform",
    "Not product-specific",
  ]),
  regions: choices("REG", [
    "APAC - Sri Lanka",
    "APAC - India",
    "APAC - Australia",
    "APAC - Other",
    "Americas - USA",
    "Americas - Other",
    "EMEA - UK",
    "EMEA - Europe",
    "EMEA - Other",
    "Global / Multi-region",
  ]),
};

const MOCK_ENGAGEMENT_CODES: Choice[] = [
  { value: "ENG-1001", label: "ENG-1001 - Platform Engineering" },
  { value: "ENG-1002", label: "ENG-1002 - Sales Operations" },
  { value: "ENG-2040", label: "ENG-2040 - Facilities" },
];

const MOCK_BUDGET_APPROVERS: BudgetApproverOption[] = [{ id: "10", name: "Budget Owner" }];

/** The code of a sample list entry, found by its label. */
const codeOf = (list: Choice[], label: string): string => list.find((c) => c.label === label)?.value ?? "";

const SEARCH_LIMIT = 10;
const MIN_QUERY_LENGTH = 3;

function seedRequests(requester: Person): PurchaseRequest[] {
  const L = MOCK_LOOKUPS;
  const base = { additionalApprovers: [], notes: "", requester, attachments: [], budgetApproverId: "10", budgetApproverName: "Budget Owner" };
  const vendor = (name: string, website: string) => ({ name, website, contact: "", email: "", phone: "" });
  return [
    {
      ...base,
      id: "seed-1",
      reference: "PR-2026-00003",
      title: "ZoomInfo",
      category: "IT",
      status: "submitted",
      teamLead: TEAM_LEAD,
      teamLeadDecision: { decision: "pending", notes: "", decidedAt: null },
      vendors: [vendor("ZoomInfo", "https://www.zoominfo.com")],
      budget: {
        category: codeOf(L.budgetCategories, "Software & Subscriptions"),
        businessUnit: codeOf(L.businessUnits, "Sales"),
        product: codeOf(L.products, "Not product-specific"),
        region: codeOf(L.regions, "Global / Multi-region"),
        engagementCode: "",
        salesforceCampaign: "",
      },
      details: {
        ...emptyDetails(),
        product: "ZoomInfo",
        plan: "Enterprise",
        description: "Contact and company data for the Sales team's prospecting.",
        usagePeriod: "1 year",
        businessJustification: "The current subscription ends next month.",
        sensitiveData: "no",
        externalPii: "yes",
        externalPiiDetail: "Names, business emails and phone numbers of prospects.",
        employeePii: "no",
        integrates: "yes",
        integrations: [{ system: "Salesforce", data: "Syncs contacts nightly via API" }],
        vendorDocs: "no",
      },
      submittedAt: "2026-10-28T09:12:00.000Z",
      updatedAt: "2026-10-28T09:12:00.000Z",
    },
    {
      ...base,
      id: "seed-2",
      reference: "PR-2026-00002",
      title: "Co-working space, Colombo",
      category: "NON-IT",
      status: "rejected",
      teamLead: TEAM_LEAD,
      teamLeadDecision: {
        decision: "rejected",
        notes: "Please get a second quote and confirm the budget line.",
        decidedAt: "2026-10-27T14:30:00.000Z",
      },
      vendors: [vendor("IWG / Spaces", "https://www.spacesworks.com")],
      budget: {
        category: codeOf(L.budgetCategories, "Facilities & Office"),
        businessUnit: codeOf(L.businessUnits, "Facilities & Admin"),
        product: codeOf(L.products, "Not product-specific"),
        region: codeOf(L.regions, "APAC - Sri Lanka"),
        engagementCode: "ENG-1001",
        salesforceCampaign: "",
      },
      details: {
        ...emptyDetails(),
        description: "Ten co-working desks in Colombo for six months.",
        businessJustification: "Overflow seating while the office is refurbished.",
      },
      submittedAt: "2026-10-26T08:00:00.000Z",
      updatedAt: "2026-10-27T14:30:00.000Z",
    },
    {
      ...base,
      id: "seed-3",
      reference: "PR-2026-00001",
      title: "SentinelOne",
      category: "IT",
      status: "approved",
      teamLead: TEAM_LEAD,
      teamLeadDecision: { decision: "approved", notes: "", decidedAt: "2026-10-22T10:05:00.000Z" },
      vendors: [vendor("SentinelOne", "https://www.sentinelone.com")],
      budget: {
        category: codeOf(L.budgetCategories, "Software & Subscriptions"),
        businessUnit: codeOf(L.businessUnits, "Engineering - Platform"),
        product: codeOf(L.products, "Cross-product / Platform"),
        region: codeOf(L.regions, "Global / Multi-region"),
        engagementCode: "",
        salesforceCampaign: "",
      },
      details: {
        ...emptyDetails(),
        product: "SentinelOne",
        plan: "Complete",
        description: "Endpoint protection for engineering laptops.",
        usagePeriod: "1 year",
        businessJustification: "Replaces the current endpoint tool, which reaches end of support.",
        sensitiveData: "yes",
        sensitiveDataDetail: "Endpoint telemetry from laptops that hold source code.",
        externalPii: "no",
        employeePii: "no",
        integrates: "no",
      },
      submittedAt: "2026-10-21T11:40:00.000Z",
      updatedAt: "2026-10-22T10:05:00.000Z",
    },
  ];
}

function titleFor(input: PurchaseRequestInput): string {
  const text = input.category === "IT" ? input.details.product : input.details.description;
  return text.trim().split("\n")[0].slice(0, 80) || "Untitled request";
}

function buildMockProcurementApi(user: Person): ProcurementApi {
  const requests: PurchaseRequest[] = seedRequests(user);
  let counter = requests.length;
  const me: ProcurementMe = { ...user, roles: [], teamLead: TEAM_LEAD, approvalExempt: false };

  const find = (requestId: string): PurchaseRequest => {
    const found = requests.find((r) => r.id === requestId);
    if (!found) throw new Error("Request not found.");
    return found;
  };

  const assertApprovers = (input: PurchaseRequestInput): void => {
    const emails = input.additionalApprovers.map((e) => e.toLowerCase());
    if (emails.includes(user.email.toLowerCase()) || emails.includes(TEAM_LEAD.email.toLowerCase())) {
      throw new Error("An additional approver cannot be you or your team lead.");
    }
  };

  const approverName = (id: string): string => MOCK_BUDGET_APPROVERS.find((a) => a.id === id)?.name ?? "";

  return {
    getMe: async () => me,
    getLookups: async () => MOCK_LOOKUPS,
    getBudgetApprovers: async ({ businessUnit, region }) => (businessUnit || region ? MOCK_BUDGET_APPROVERS : []),
    getEngagementCodes: async (businessUnitName) => (businessUnitName ? MOCK_ENGAGEMENT_CODES : []),
    searchDirectory: async (query) => {
      const q = query.trim().toLowerCase();
      if (q.length < MIN_QUERY_LENGTH) return [];
      return MOCK_DIRECTORY.filter(
        (p) => p.email.toLowerCase() !== user.email.toLowerCase() && (p.email.toLowerCase().startsWith(q) || p.name.toLowerCase().includes(q)),
      ).slice(0, SEARCH_LIMIT);
    },
    listMyRequests: async () =>
      [...requests]
        .sort((a, b) => (b.submittedAt ?? b.updatedAt).localeCompare(a.submittedAt ?? a.updatedAt))
        .map(({ id, reference, title, category, status, submittedAt, updatedAt }) => ({ id, reference, title, category, status, submittedAt, updatedAt })),
    getRequest: async (requestId) => find(requestId),
    submitRequest: async (input) => {
      if (!input.declarationAccepted) throw new Error("Confirm the declaration before submitting.");
      assertApprovers(input);
      counter += 1;
      const now = new Date().toISOString();
      const created: PurchaseRequest = {
        id: `mock-${counter}`,
        reference: `PR-${now.slice(0, 4)}-${String(counter).padStart(5, "0")}`,
        title: titleFor(input),
        category: input.category,
        status: "submitted",
        requester: user,
        teamLead: TEAM_LEAD,
        additionalApprovers: input.additionalApprovers,
        teamLeadDecision: { decision: "pending", notes: "", decidedAt: null },
        details: input.details,
        vendors: input.vendors,
        budget: input.budget,
        budgetApproverId: input.budgetApproverId,
        budgetApproverName: approverName(input.budgetApproverId),
        notes: input.notes,
        attachments: [],
        submittedAt: now,
        updatedAt: now,
      };
      requests.push(created);
      return created;
    },
    resubmitRequest: async (requestId, input) => {
      const existing = find(requestId);
      if (existing.status !== "rejected") throw new Error("Only a rejected request can be edited and resubmitted.");
      assertApprovers(input);
      Object.assign(existing, {
        title: titleFor(input),
        category: input.category,
        status: "submitted",
        additionalApprovers: input.additionalApprovers,
        teamLeadDecision: { decision: "pending", notes: "", decidedAt: null },
        details: input.details,
        vendors: input.vendors,
        budget: input.budget,
        budgetApproverId: input.budgetApproverId,
        budgetApproverName: approverName(input.budgetApproverId),
        notes: input.notes,
        updatedAt: new Date().toISOString(),
      });
      return existing;
    },
  };
}

const mockApis = new Map<string, ProcurementApi>();

/**
 * One in-memory store per user, kept for the life of the page so a request
 * raised on one screen is still there on the next.
 *
 * @param user - The signed-in user, who owns every request the mock returns
 */
export function createMockProcurementApi(user: Person): ProcurementApi {
  let api = mockApis.get(user.id);
  if (!api) {
    api = buildMockProcurementApi(user);
    mockApis.set(user.id, api);
  }
  return api;
}

/** Forget every user's sample data, for tests. */
export function resetMockProcurementApis(): void {
  mockApis.clear();
}
