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

// Turns the backend's wire shapes into the UI's own types, so a change in the
// backend's shape is felt here and in its tests, not on a screen.

import { emptyDetails } from "../request-form/requestFormModel";
import type {
  BudgetApproverOption,
  BudgetDetails,
  Choice,
  Person,
  ProcurementMe,
  PurchaseRequest,
  RequestCategory,
  RequestStatus,
  RequestSummary,
  TeamLeadDecision,
  Vendor,
  YesNo,
} from "../types";
import type {
  BackendBudgetApprover,
  BackendCategory,
  BackendDirectoryUser,
  BackendEngagementOption,
  BackendReferenceItem,
  BackendRequestDetail,
  BackendRequestSummary,
  BackendStatus,
  BackendTeamLeadResult,
  BackendUser,
} from "./backendTypes";

const CATEGORY: Record<BackendCategory, RequestCategory> = { IT: "IT", NON_IT: "NON-IT", MARKETING_EVENTS: "EVENTS" };

const STATUS: Record<BackendStatus, RequestStatus> = {
  DRAFT: "draft",
  PENDING_APPROVAL: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
  ASSIGNED: "assigned",
  CANCELLED: "cancelled",
};

export const toPerson = ({ email, name }: BackendDirectoryUser): Person => ({ id: email, name, email });

/** The person a request or an approval names only by email. */
const personFromEmail = (email: string): Person => ({ id: email, name: email, email });

export const toChoices = (items: BackendReferenceItem[]): Choice[] =>
  items.map(({ code, label }) => ({ value: code, label }));

/** An engagement is shown as its code and name, or the code alone when they are the same. */
export const toEngagementChoices = (items: BackendEngagementOption[]): Choice[] =>
  items.map(({ code, name }) => ({ value: code, label: name && name !== code ? `${code} - ${name}` : code }));

export const toBudgetApprovers = (items: BackendBudgetApprover[]): BudgetApproverOption[] =>
  items.map(({ id, name }) => ({ id: String(id), name }));

/**
 * @param signedIn - The signed-in person from the id_token, because the backend names only the email
 */
export function toMe(user: BackendUser, lead: BackendTeamLeadResult, signedIn: Person): ProcurementMe {
  return {
    ...signedIn,
    email: user.email,
    roles: user.roles,
    teamLead: lead.teamLead ? toPerson(lead.teamLead) : null,
    approvalExempt: lead.approvalExempt,
  };
}

export function toSummary(row: BackendRequestSummary): RequestSummary {
  return {
    id: String(row.id),
    reference: row.referenceNo,
    title: row.title,
    category: CATEGORY[row.category],
    status: STATUS[row.status],
    submittedAt: row.submittedOn,
    updatedAt: row.updatedOn,
  };
}

const yesNo = (value: boolean | undefined): YesNo => (value ? "yes" : "no");

/** What the backend holds of the content. The rest of what the form asks has no field there yet and stays empty. */
function toDetails(d: BackendRequestDetail) {
  const base = emptyDetails();
  const saas = d.saasDetails;
  return {
    ...base,
    description: d.requirementDetails,
    product: d.itDetails?.softwareName ?? "",
    ...(saas && {
      userCount: String(saas.userCount),
      userNames: saas.userDetails ? [saas.userDetails] : [],
      adminCount: String(saas.adminCount),
      adminNames: saas.adminDetails ? [saas.adminDetails] : [],
      sensitiveData: yesNo(saas.handlesSensitiveData),
      sensitiveDataDetail: saas.sensitiveDataDetails ?? "",
      externalPii: yesNo(saas.handlesExternalPii),
      externalPiiDetail: saas.externalPiiDetails ?? "",
      employeePii: yesNo(saas.handlesEmployeePii),
      employeePiiDetail: saas.employeePiiDetails ?? "",
      integrates: yesNo(saas.integratesInternalSystems),
      integrations: saas.integrationDetails ? [{ system: saas.integrationDetails, data: "" }] : base.integrations,
      vendorDocs: yesNo(Boolean(saas.vendorDocsLinks)),
      vendorDocsLink: saas.vendorDocsLinks ?? "",
    }),
  };
}

/** The decision on the version being read; an older version's decision does not count. */
function toDecision(d: BackendRequestDetail): TeamLeadDecision {
  const latest = d.decisions
    .filter((x) => x.version === d.version)
    .sort((a, b) => b.decidedOn.localeCompare(a.decidedOn))[0];
  if (!latest) return { decision: "pending", notes: "", decidedAt: null };
  return {
    decision: latest.decision === "APPROVED" ? "approved" : "rejected",
    notes: latest.comment ?? "",
    decidedAt: latest.decidedOn,
  };
}

export function toRequest(d: BackendRequestDetail): PurchaseRequest {
  const budget: BudgetDetails = {
    category: d.budgetCategoryCode ?? "",
    businessUnit: d.businessUnitCode ?? "",
    product: d.productCode ?? "",
    region: d.regionCode ?? "",
    engagementCode: d.engagementCode ?? "",
    salesforceCampaign: "",
  };
  const vendors: Vendor[] = d.vendorName
    ? [{ name: d.vendorName, website: "", contact: "", email: "", phone: "" }]
    : [];
  return {
    ...toSummary(d),
    requester: { id: d.requesterEmail, name: d.requesterName, email: d.requesterEmail },
    teamLead: d.teamLeadEmail ? personFromEmail(d.teamLeadEmail) : null,
    additionalApprovers: d.additionalApprovers,
    teamLeadDecision: toDecision(d),
    details: toDetails(d),
    vendors,
    budget,
    budgetApproverId: d.budgetApproverId === null ? "" : String(d.budgetApproverId),
    budgetApproverName: d.budgetApproverName ?? "",
    notes: "",
    attachments: [],
  };
}
