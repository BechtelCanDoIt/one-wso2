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

// SAMPLE DATA ONLY, served in dev builds while the Procurement backend does not
// exist (see isProcurementMockActive). Held in memory, so a reload starts over;
// nothing is written to browser storage. It applies the rules the backend will
// own, so the screens meet the same refusals: the team lead must be someone in
// the directory and never the requester, and only a rejected request is edited.

import type {
  Person,
  ProcurementLookups,
  ProcurementMe,
  PurchaseRequest,
  PurchaseRequestInput,
} from "../types";
import { emptyDetails } from "../request-form/requestFormModel";
import type { ProcurementApi } from "./procurementApi";

// Sample people, lists and vendors.
export const MOCK_DIRECTORY: readonly Person[] = [
  { id: "u-1", name: "Alex Morgan", email: "alex.morgan@example.com" },
  { id: "u-2", name: "Blake Rivers", email: "blake.rivers@example.com" },
  { id: "u-3", name: "Casey Lane", email: "casey.lane@example.com" },
  { id: "u-4", name: "Drew Parker", email: "drew.parker@example.com" },
  { id: "u-5", name: "Emery Quinn", email: "emery.quinn@example.com" },
  { id: "u-6", name: "Finley Brooks", email: "finley.brooks@example.com" },
  { id: "u-7", name: "Legal Reviewer", email: "legal.reviewer@example.com" },
  { id: "u-8", name: "Security Reviewer", email: "security.reviewer@example.com" },
  { id: "u-9", name: "Compliance Reviewer", email: "compliance.reviewer@example.com" },
  { id: "u-10", name: "Budget Owner", email: "budget.owner@example.com" },
  { id: "u-11", name: "Jordan Ellis", email: "jordan.ellis@example.com" },
];

const MOCK_LOOKUPS: ProcurementLookups = {
  itCategories: [
    "Software licences & subscriptions (incl. renewals)",
    "SaaS platform / cloud service",
    "IT support services",
    "Hosting services & domain names",
    "IT hardware & equipment",
    "Free / open-source tool (approval required)",
    "Other IT solution",
  ],
  usagePeriods: [
    "Trial / pilot (under 3 months)",
    "Monthly plan",
    "1 year",
    "2 years",
    "3+ years",
    "Ongoing / perpetual",
    "Other",
  ],
  budgetCategories: [
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
  ],
  businessUnits: [
    "Finance",
    "Engineering - Platform",
    "Marketing",
    "Sales",
    "People Operations",
    "Facilities & Admin",
    "Legal",
    "Customer Success",
  ],
  products: [
    "WSO2 API Manager",
    "WSO2 Identity Server",
    "WSO2 MI / Integration",
    "Choreo",
    "Asgardeo",
    "Ballerina",
    "Cross-product / Platform",
    "Not product-specific",
  ],
  regions: [
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
  ],
  // The prototype ships no engagement codes, so the field takes what is typed.
  engagementCodes: [],
  // The prototype names its Budget Owner as the approver of every business unit.
  budgetApprovers: MOCK_DIRECTORY.filter((p) => p.id === "u-10"),
};

const SEARCH_LIMIT = 8;
const MIN_QUERY_LENGTH = 2;

function seedRequests(requester: Person): PurchaseRequest[] {
  const base = {
    budgetApprovers: [{ email: "budget.owner@example.com" }],
    notes: "",
    declarationAccepted: true,
    requester,
    attachments: [],
  };
  const vendor = (name: string, website: string) => ({ name, website, contact: "", email: "", phone: "" });
  return [
    {
      ...base,
      id: "seed-1",
      reference: "PR-2026-0003",
      title: "ZoomInfo",
      category: "IT",
      status: "submitted",
      teamLead: MOCK_DIRECTORY[1],
      teamLeadDecision: { decision: "pending", notes: "", decidedAt: null },
      vendors: [vendor("ZoomInfo", "https://www.zoominfo.com")],
      budget: {
        category: "Software & Subscriptions",
        businessUnit: "Sales",
        product: "Not product-specific",
        region: "Global / Multi-region",
        engagementCode: "",
        salesforceCampaign: "",
      },
      details: {
        ...emptyDetails(),
        itCategory: "Software licences & subscriptions (incl. renewals)",
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
      reference: "PR-2026-0002",
      title: "Co-working space, Colombo",
      category: "NON-IT",
      status: "rejected",
      teamLead: MOCK_DIRECTORY[2],
      teamLeadDecision: {
        decision: "rejected",
        notes: "Please get a second quote and confirm the budget line.",
        decidedAt: "2026-10-27T14:30:00.000Z",
      },
      vendors: [vendor("IWG / Spaces", "https://www.spacesworks.com")],
      budget: {
        category: "Facilities & Office",
        businessUnit: "Facilities & Admin",
        product: "Not product-specific",
        region: "APAC - Sri Lanka",
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
      reference: "PR-2026-0001",
      title: "SentinelOne",
      category: "IT",
      status: "approved",
      teamLead: MOCK_DIRECTORY[3],
      teamLeadDecision: { decision: "approved", notes: "", decidedAt: "2026-10-22T10:05:00.000Z" },
      vendors: [vendor("SentinelOne", "https://www.sentinelone.com")],
      budget: {
        category: "Software & Subscriptions",
        businessUnit: "Engineering - Platform",
        product: "Cross-product / Platform",
        region: "Global / Multi-region",
        engagementCode: "",
        salesforceCampaign: "",
      },
      details: {
        ...emptyDetails(),
        itCategory: "SaaS platform / cloud service",
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

function directoryPerson(id: string): Person {
  const person = MOCK_DIRECTORY.find((p) => p.id === id);
  if (!person) throw new Error("The team lead must be an active WSO2 employee.");
  return person;
}

function buildMockProcurementApi(user: Person): ProcurementApi {
  const requests: PurchaseRequest[] = seedRequests(user);
  let counter = requests.length;
  const me: ProcurementMe = { ...user, reportingLead: MOCK_DIRECTORY[10] };

  const find = (requestId: string): PurchaseRequest => {
    const found = requests.find((r) => r.id === requestId);
    if (!found) throw new Error("Request not found.");
    return found;
  };

  const assertTeamLead = (input: PurchaseRequestInput): Person => {
    const teamLead = directoryPerson(input.teamLeadId);
    if (teamLead.id === user.id || teamLead.email.toLowerCase() === user.email.toLowerCase()) {
      throw new Error("You cannot be the team lead on your own request.");
    }
    return teamLead;
  };

  const attachmentsOf = (files: File[]) =>
    files.map((file, index) => ({ id: `doc-${Date.now()}-${index}`, filename: file.name, sizeBytes: file.size }));

  return {
    getMe: async () => me,
    getLookups: async () => MOCK_LOOKUPS,
    searchDirectory: async (query) => {
      const q = query.trim().toLowerCase();
      if (q.length < MIN_QUERY_LENGTH) return [];
      return MOCK_DIRECTORY.filter(
        (p) => p.id !== user.id && (p.name.toLowerCase().includes(q) || p.email.toLowerCase().startsWith(q)),
      ).slice(0, SEARCH_LIMIT);
    },
    listMyRequests: async () => [...requests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    getRequest: async (requestId) => find(requestId),
    submitRequest: async (input, files) => {
      if (!input.declarationAccepted) throw new Error("Confirm the declaration before submitting.");
      const teamLead = assertTeamLead(input);
      counter += 1;
      const now = new Date().toISOString();
      const created: PurchaseRequest = {
        id: `mock-${counter}`,
        reference: `PR-${now.slice(0, 4)}-${String(counter).padStart(4, "0")}`,
        title: titleFor(input),
        category: input.category,
        status: "submitted",
        requester: user,
        teamLead,
        teamLeadDecision: { decision: "pending", notes: "", decidedAt: null },
        details: input.details,
        vendors: input.vendors,
        budget: input.budget,
        budgetApprovers: input.budgetApprovers,
        notes: input.notes,
        declarationAccepted: true,
        attachments: attachmentsOf(files),
        submittedAt: now,
        updatedAt: now,
      };
      requests.push(created);
      return created;
    },
    resubmitRequest: async (requestId, input, files) => {
      const existing = find(requestId);
      if (existing.status !== "rejected") throw new Error("Only a rejected request can be edited and resubmitted.");
      const teamLead = assertTeamLead(input);
      Object.assign(existing, {
        title: titleFor(input),
        category: input.category,
        status: "submitted",
        teamLead,
        teamLeadDecision: { decision: "pending", notes: "", decidedAt: null },
        details: input.details,
        vendors: input.vendors,
        budget: input.budget,
        budgetApprovers: input.budgetApprovers,
        notes: input.notes,
        attachments: [...existing.attachments, ...attachmentsOf(files)],
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
