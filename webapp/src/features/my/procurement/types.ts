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

// Shapes of the Procurement contract, as the UI reads and writes them. The
// backend's own wire shapes live in api/backendTypes.ts; api/backendMapping.ts
// converts between the two.

export type ProcurementCategory = "IT" | "NON-IT";

/** A category a request can have when it is read back; Marketing & Events cannot be raised here yet. */
export type RequestCategory = ProcurementCategory | "EVENTS";

/**
 * Where a request stands. `draft` is saved but not sent; `submitted` waits on
 * the approvers; `approved` waits for Procurement to assign it; `assigned` is
 * where phase 1 ends; `cancelled` was withdrawn by the requester.
 */
export type RequestStatus = "draft" | "submitted" | "approved" | "rejected" | "assigned" | "cancelled";

export type YesNo = "yes" | "no";

/** How the software is installed, as the backend names it. */
export type InstallationType = "PORTABLE" | "PLUGIN" | "BROWSER_EXTENSION" | "STANDALONE" | "SAAS";

/** Whose licence the software is used under, as the backend names it. */
export type LicenseType = "FREE_COMMERCIAL" | "PERSONAL" | "CUSTOMER" | "COMPANY";

/** An employee. `id` is the email, which is what the backend identifies people by. */
export interface Person {
  id: string;
  name: string;
  email: string;
}

export interface ProcurementMe extends Person {
  /** Procurement roles taken from the user's groups, e.g. `procurement_user`. */
  roles: string[];
  /** The manager who approves the user's requests, when there is one. */
  teamLead: Person | null;
  /** True for someone whose requests need no approver, such as the CEO. */
  approvalExempt: boolean;
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

/** What the requester says about a request, per category. Free text is shown as text, never HTML. */
export interface RequestDetails {
  product: string;
  plan: string;
  description: string;
  installationType: InstallationType | "";
  licenseType: LicenseType | "";
  softwareUrl: string;
  pricingUrl: string;
  termsUrl: string;
  privacyUrl: string;
  securityUrl: string;
  urgent: YesNo | "";
  urgencyJustification: string;
  authorizedListChecked: boolean;
  legitimacyConfirmed: boolean;
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

/** The budget details of a request. Each list value is the code the backend knows it by. */
export interface BudgetDetails {
  category: string;
  businessUnit: string;
  product: string;
  region: string;
  engagementCode: string;
  salesforceCampaign: string;
}

/** What the requester fills in. The requester, team lead, status and dates are set by the server, never sent. */
export interface PurchaseRequestInput {
  category: ProcurementCategory;
  /** Emails of the people who may approve besides the team lead; at most 5. */
  additionalApprovers: string[];
  details: RequestDetails;
  vendors: Vendor[];
  budget: BudgetDetails;
  /** The chosen budget approver's id, or "" when none. */
  budgetApproverId: string;
  notes: string;
  declarationAccepted: boolean;
}

/** The decision on a request's current version: the latest one, which a Procurement override can replace. */
export interface TeamLeadDecision {
  decision: "pending" | "approved" | "rejected";
  notes: string;
  decidedAt: string | null;
  /** Email of whoever decided, or "" while pending. */
  decidedBy: string;
  /** True when a Procurement admin made this decision, not an approver. */
  isOverride: boolean;
}

/** A row of My Requests. */
export interface RequestSummary {
  id: string;
  /** Null until the request is first submitted. */
  reference: string | null;
  title: string;
  category: RequestCategory;
  status: RequestStatus;
  submittedAt: string | null;
  updatedAt: string;
}

export interface PurchaseRequest extends RequestSummary {
  requester: Person;
  /** Null when nobody approves, or the backend did not say who. */
  teamLead: Person | null;
  additionalApprovers: string[];
  teamLeadDecision: TeamLeadDecision;
  details: RequestDetails;
  vendors: Vendor[];
  budget: BudgetDetails;
  budgetApproverId: string;
  budgetApproverName: string;
  notes: string;
}

/** One entry of a pick list: what is stored, and what the person sees. */
export interface Choice {
  value: string;
  label: string;
}

/** A budget approver the requester can choose. */
export interface BudgetApproverOption {
  id: string;
  name: string;
}

/** The lists the form's pickers draw from. Engagement codes and budget approvers depend on the business unit and region, so they are asked for separately. */
export interface ProcurementLookups {
  budgetCategories: Choice[];
  businessUnits: Choice[];
  products: Choice[];
  regions: Choice[];
}
