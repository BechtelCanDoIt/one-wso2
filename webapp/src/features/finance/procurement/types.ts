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

// Shapes of the Procurement phase 1 contract, as the UI reads and writes them.
// The backend does not exist yet: this is the contract the UI proposes, and
// `api/procurementApi.ts` is the one place that has to change if it differs.

export type ProcurementCategory = "IT" | "NON-IT";

/**
 * Where a request stands. `submitted` is waiting on the team lead; `approved`
 * is waiting for Procurement to assign it; `assigned` is where phase 1 ends.
 */
export type RequestStatus = "submitted" | "approved" | "rejected" | "assigned";

export type YesNo = "yes" | "no";

/** A signed-in employee, as the directory knows them. `id` is the Asgardeo user id. */
export interface Person {
  id: string;
  name: string;
  email: string;
}

export interface ProcurementMe extends Person {
  /** The requester's reporting lead, who is the team lead unless the requester picks another. */
  reportingLead: Person | null;
}

export interface Integration {
  system: string;
  data: string;
}

export interface Vendor {
  name: string;
  website: string;
  contact: string;
  email: string;
  phone: string;
}

export interface BudgetApprover {
  email: string;
}

/** What the requester says about a request, per category. Free text is shown as text, never HTML. */
export interface RequestDetails {
  itCategory: string;
  product: string;
  plan: string;
  description: string;
  userCount: string;
  userNames: string[];
  adminCount: string;
  adminNames: string[];
  usagePeriod: string;
  businessJustification: string;
  roi: string;
  specifications: string;
  sensitiveData: YesNo | "";
  sensitiveDataDetail: string;
  externalPii: YesNo | "";
  externalPiiDetail: string;
  employeePii: YesNo | "";
  employeePiiDetail: string;
  integrates: YesNo | "";
  integrations: Integration[];
  vendorDocs: YesNo | "";
  vendorDocsLink: string;
}

export interface BudgetDetails {
  category: string;
  businessUnit: string;
  product: string;
  region: string;
  engagementCode: string;
  salesforceCampaign: string;
}

/** Metadata of a file attached to a request; the file itself stays on the backend. */
export interface AttachmentInfo {
  id: string;
  filename: string;
  sizeBytes: number;
}

/** What the requester fills in. The requester, status and dates are set by the server, never sent. */
export interface PurchaseRequestInput {
  category: ProcurementCategory;
  teamLeadId: string;
  details: RequestDetails;
  vendors: Vendor[];
  budget: BudgetDetails;
  budgetApprovers: BudgetApprover[];
  notes: string;
  declarationAccepted: boolean;
}

export interface TeamLeadDecision {
  decision: "pending" | "approved" | "rejected";
  notes: string;
  decidedAt: string | null;
}

export interface PurchaseRequest extends Omit<PurchaseRequestInput, "teamLeadId"> {
  id: string;
  reference: string;
  title: string;
  status: RequestStatus;
  requester: Person;
  teamLead: Person;
  teamLeadDecision: TeamLeadDecision;
  attachments: AttachmentInfo[];
  submittedAt: string;
  updatedAt: string;
}

/** The lists the form's pickers draw from. */
export interface ProcurementLookups {
  itCategories: string[];
  usagePeriods: string[];
  budgetCategories: string[];
  businessUnits: string[];
  products: string[];
  regions: string[];
  /** Read-only NetSuite cost-center codes, through the Finance entity service. */
  engagementCodes: string[];
  budgetApprovers: Person[];
}
