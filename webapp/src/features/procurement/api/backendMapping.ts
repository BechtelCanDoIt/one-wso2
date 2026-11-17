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
  ApprovalDecisionInput,
  ApprovalItem,
  Person,
  ProcurementMe,
  PurchaseRequest,
  PurchaseRequestInput,
  QueueItem,
  RequestCategory,
  RequestStatus,
  RequestSummary,
  TeamLeadDecision,
  Vendor,
  YesNo,
} from "../types";
import type {
  BackendAnswer,
  BackendApprovalItem,
  BackendNewDecision,
  BackendProcurementItem,
  BackendItDetails,
  BackendBudgetApprover,
  BackendCategory,
  BackendDirectoryUser,
  BackendEngagementOption,
  BackendNewRequest,
  BackendReferenceItem,
  BackendRequestDetail,
  BackendRequestSummary,
  BackendSaasDetails,
  BackendStatus,
  BackendTeamLeadResult,
  BackendUser,
  BackendVendor,
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

const BACKEND_STATUS = Object.fromEntries(Object.entries(STATUS).map(([backend, ui]) => [ui, backend])) as Record<RequestStatus, BackendStatus>;

export const toBackendStatus = (status: RequestStatus): BackendStatus => BACKEND_STATUS[status];

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

export function toApprovalItem(row: BackendApprovalItem): ApprovalItem {
  return {
    id: String(row.id),
    reference: row.referenceNo,
    title: row.title,
    category: CATEGORY[row.category],
    status: STATUS[row.status],
    requester: { id: row.requesterEmail, name: row.requesterName, email: row.requesterEmail },
    submittedAt: row.submittedOn,
    updatedAt: row.updatedOn,
  };
}

export function toQueueItem(row: BackendProcurementItem): QueueItem {
  return {
    id: String(row.id),
    reference: row.referenceNo,
    title: row.title,
    category: CATEGORY[row.category],
    status: STATUS[row.status],
    priority: row.priority,
    assignee: row.assigneeEmail ?? "",
    requester: { id: row.requesterEmail, name: row.requesterName, email: row.requesterEmail },
    updatedAt: row.updatedOn,
  };
}

export function toNewDecision(input: ApprovalDecisionInput): BackendNewDecision {
  return {
    decision: input.decision === "approved" ? "APPROVED" : "REJECTED",
    comment: orNull(input.comment),
    disclaimerAccepted: input.decision === "approved" && input.disclaimerAccepted,
  };
}

/** An answer the backend did not give stays unanswered; only an explicit true or false is a Yes or a No. */
const yesNo = (value: boolean | undefined): YesNo | "" => (value === undefined ? "" : value ? "yes" : "no");

/** The questions the backend keeps as free-form answers, because it has no field for them. */
const ANSWER_PLAN = "plan";
const ANSWER_USAGE_PERIOD = "usagePeriod";

const answerOf = (answers: BackendAnswer[], key: string): string => answers.find((a) => a.questionKey === key)?.answer ?? "";

/** A list of names or integrations the backend holds as one text, one per line, so a name can hold a comma. */
const NAME_SEPARATOR = "\n";
const toNames = (text: string): string[] => text.split(NAME_SEPARATOR).map((n) => n.trim()).filter(Boolean);
const integrationsToText = (rows: { system: string; data: string }[]): string =>
  rows.map((r) => (r.data ? `${r.system}: ${r.data}` : r.system)).join("\n");
const integrationsFromText = (text: string): { system: string; data: string }[] =>
  text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const at = line.indexOf(": ");
      return at < 0 ? { system: line, data: "" } : { system: line.slice(0, at), data: line.slice(at + 2) };
    });

const orNull = (value: string): string | null => (value.trim() === "" ? null : value.trim());

function toDetails(d: BackendRequestDetail) {
  const base = emptyDetails();
  const it = d.itDetails;
  const saas = d.saasDetails;
  return {
    ...base,
    description: d.requirementDetails,
    plan: answerOf(d.answers, ANSWER_PLAN),
    usagePeriod: answerOf(d.answers, ANSWER_USAGE_PERIOD),
    businessJustification: d.businessJustification ?? "",
    roi: d.roi ?? "",
    specifications: d.additionalSpecifications ?? "",
    ...(it && {
      product: it.softwareName,
      installationType: it.installationType,
      licenseType: it.licenseType,
      softwareUrl: it.softwareUrl,
      pricingUrl: it.pricingUrl,
      termsUrl: it.termsUrl,
      privacyUrl: it.privacyUrl,
      securityUrl: it.securityUrl,
      urgent: yesNo(it.isUrgent ?? false),
      urgencyJustification: it.urgencyJustification ?? "",
      authorizedListChecked: it.authorizedListChecked ?? false,
      legitimacyConfirmed: it.legitimacyConfirmed ?? false,
    }),
    ...(saas && {
      userCount: String(saas.userCount),
      userNames: toNames(saas.userDetails),
      adminCount: String(saas.adminCount),
      adminNames: toNames(saas.adminDetails),
      sensitiveData: yesNo(saas.handlesSensitiveData),
      sensitiveDataDetail: saas.sensitiveDataDetails ?? "",
      externalPii: yesNo(saas.handlesExternalPii),
      externalPiiDetail: saas.externalPiiDetails ?? "",
      employeePii: yesNo(saas.handlesEmployeePii),
      employeePiiDetail: saas.employeePiiDetails ?? "",
      integrates: yesNo(saas.integratesInternalSystems),
      integrations: saas.integrationDetails ? integrationsFromText(saas.integrationDetails) : base.integrations,
      vendorDocs: yesNo(Boolean(saas.vendorDocsLinks)),
      vendorDocsLink: saas.vendorDocsLinks ?? "",
    }),
  };
}

/**
 * The latest decision on the version being read; an older version's decision does not
 * count. It may be a Procurement override, so it says who decided.
 */
function toDecision(d: BackendRequestDetail): TeamLeadDecision {
  const latest = d.decisions
    .filter((x) => x.version === d.version)
    .sort((a, b) => b.decidedOn.localeCompare(a.decidedOn))[0];
  if (!latest) return { decision: "pending", notes: "", decidedAt: null, decidedBy: "", isOverride: false };
  return {
    decision: latest.decision === "APPROVED" ? "approved" : "rejected",
    notes: latest.comment ?? "",
    decidedAt: latest.decidedOn,
    decidedBy: latest.decidedBy,
    isOverride: latest.isOverride,
  };
}

const toVendor = (v: BackendVendor): Vendor => ({
  name: v.name,
  website: v.website ?? "",
  contact: v.contactName ?? "",
  email: v.contactEmail ?? "",
  phone: v.contactPhone ?? "",
});

export function toRequest(d: BackendRequestDetail): PurchaseRequest {
  const budget: BudgetDetails = {
    category: d.budgetCategoryCode ?? "",
    businessUnit: d.businessUnitCode ?? "",
    product: d.productCode ?? "",
    region: d.regionCode ?? "",
    engagementCode: d.engagementCode ?? "",
    salesforceCampaign: d.salesforceCampaign ?? "",
  };
  const vendors: Vendor[] = d.vendors.length
    ? d.vendors.map(toVendor)
    : d.vendorName
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
    notes: d.notes ?? "",
    priority: d.priority,
    assignee: d.assigneeEmail ?? "",
    collaborators: d.collaborators,
  };
}

/**
 * The body the backend saves a request from. What the backend has no field for (the plan
 * and the usage period) goes in as answers; the title is left for the backend to make.
 */
export function toNewRequest(input: PurchaseRequestInput): BackendNewRequest {
  const { details: d, budget: b } = input;
  const isIt = input.category === "IT";
  const saas = isIt && d.installationType === "SAAS";
  const answers: BackendAnswer[] = isIt
    ? [
        { questionKey: ANSWER_PLAN, answer: orNull(d.plan) },
        { questionKey: ANSWER_USAGE_PERIOD, answer: orNull(d.usagePeriod) },
      ].filter((a) => a.answer !== null)
    : [];
  const saasDetails: BackendSaasDetails | null = saas
    ? {
        userCount: Number(d.userCount),
        userDetails: d.userNames.join(NAME_SEPARATOR),
        adminCount: Number(d.adminCount),
        adminDetails: d.adminNames.join(NAME_SEPARATOR),
        handlesSensitiveData: d.sensitiveData === "yes",
        sensitiveDataDetails: d.sensitiveData === "yes" ? orNull(d.sensitiveDataDetail) : null,
        handlesExternalPii: d.externalPii === "yes",
        externalPiiDetails: d.externalPii === "yes" ? orNull(d.externalPiiDetail) : null,
        handlesEmployeePii: d.employeePii === "yes",
        employeePiiDetails: d.employeePii === "yes" ? orNull(d.employeePiiDetail) : null,
        integratesInternalSystems: d.integrates === "yes",
        integrationDetails: d.integrates === "yes" ? orNull(integrationsToText(d.integrations)) : null,
        vendorDocsLinks: d.integrates === "yes" && d.vendorDocs === "yes" ? orNull(d.vendorDocsLink) : null,
      }
    : null;
  return {
    category: input.category === "IT" ? "IT" : "NON_IT",
    requirementDetails: d.description.trim(),
    businessJustification: orNull(d.businessJustification),
    roi: orNull(d.roi),
    additionalSpecifications: input.category === "NON-IT" ? orNull(d.specifications) : null,
    salesforceCampaign: orNull(b.salesforceCampaign),
    notes: orNull(input.notes),
    vendors: input.vendors.map((v) => ({
      name: v.name.trim(),
      website: orNull(v.website),
      contactName: orNull(v.contact),
      contactEmail: orNull(v.email),
      contactPhone: orNull(v.phone),
    })),
    budgetCategoryCode: orNull(b.category),
    businessUnitCode: orNull(b.businessUnit),
    productCode: orNull(b.product),
    regionCode: orNull(b.region),
    engagementCode: orNull(b.engagementCode),
    budgetApproverId: input.budgetApproverId ? Number(input.budgetApproverId) : null,
    additionalApprovers: input.additionalApprovers,
    itDetails: isIt
      ? {
          softwareName: d.product.trim(),
          isUrgent: d.urgent === "yes",
          urgencyJustification: d.urgent === "yes" ? orNull(d.urgencyJustification) : null,
          installationType: d.installationType as BackendItDetails["installationType"],
          licenseType: d.licenseType as BackendItDetails["licenseType"],
          softwareUrl: d.softwareUrl.trim(),
          pricingUrl: d.pricingUrl.trim(),
          termsUrl: d.termsUrl.trim(),
          privacyUrl: d.privacyUrl.trim(),
          securityUrl: d.securityUrl.trim(),
          authorizedListChecked: d.authorizedListChecked,
          legitimacyConfirmed: d.legitimacyConfirmed,
        }
      : null,
    saasDetails,
    answers,
  };
}
