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

// What the request form holds while it is being filled in, which step is
// missing what, and how a draft becomes the request the backend is sent. All
// pure: the screens only render it.

import type {
  BudgetDetails,
  Choice,
  Person,
  ProcurementCategory,
  ProcurementLookups,
  ProcurementMe,
  PurchaseRequest,
  PurchaseRequestInput,
  RequestDetails,
  Vendor,
} from "../types";

/** The most users or administrators the backend accepts a count for. */
const MAX_PEOPLE_COUNT = 100_000;

/** The backend only searches the directory from this many characters. */
export const MIN_DIRECTORY_QUERY = 3;

/** The most additional approvers the backend accepts on a request. */
export const MAX_ADDITIONAL_APPROVERS = 5;

/** How long the software is expected to be used. The backend keeps it as a free-form answer, so it is not a looked-up list. */
export const USAGE_PERIODS = [
  "Trial / pilot (under 3 months)",
  "Monthly plan",
  "1 year",
  "2 years",
  "3+ years",
  "Ongoing / perpetual",
  "Other",
] as const;

export const INSTALLATION_TYPES: readonly Choice[] = [
  { value: "SAAS", label: "SaaS (web-based, hosted by the vendor)" },
  { value: "STANDALONE", label: "Standalone application" },
  { value: "PLUGIN", label: "Plugin" },
  { value: "BROWSER_EXTENSION", label: "Browser extension" },
  { value: "PORTABLE", label: "Portable application" },
];

export const LICENSE_TYPES: readonly Choice[] = [
  { value: "COMPANY", label: "WSO2 company licence" },
  { value: "CUSTOMER", label: "Customer's licence" },
  { value: "FREE_COMMERCIAL", label: "Free for commercial use" },
  { value: "PERSONAL", label: "Personal licence" },
];

export const REQUEST_STEPS = ["Requester details", "Procurement category", "Requirement details", "Vendor & budget", "Review & submit"] as const;

/** The requirement step's title, which names the category once one is chosen. */
export function detailsLabel(category: RequestDraft["category"]): string {
  return category === "IT" ? "IT requirement details" : category === "NON-IT" ? "Non-IT requirement details" : "Requirement details";
}

export const STEP_REQUESTER = 1;
export const STEP_CATEGORY = 2;
export const STEP_DETAILS = 3;
export const STEP_BUDGET = 4;
export const STEP_REVIEW = 5;

export interface RequestDraft {
  category: ProcurementCategory | "";
  /** People who may approve besides the team lead, which the backend chooses. */
  additionalApprovers: Person[];
  details: RequestDetails;
  vendors: Vendor[];
  budget: BudgetDetails;
  /** The chosen budget approver's id, or "" when none. */
  budgetApproverId: string;
  notes: string;
  declarationAccepted: boolean;
}

export function emptyDetails(): RequestDetails {
  return {
    product: "",
    plan: "",
    description: "",
    installationType: "",
    licenseType: "",
    softwareUrl: "",
    pricingUrl: "",
    termsUrl: "",
    privacyUrl: "",
    securityUrl: "",
    urgent: "",
    urgencyJustification: "",
    authorizedListChecked: false,
    legitimacyConfirmed: false,
    userCount: "",
    userNames: [],
    adminCount: "",
    adminNames: [],
    usagePeriod: "",
    businessJustification: "",
    roi: "",
    specifications: "",
    sensitiveData: "",
    sensitiveDataDetail: "",
    externalPii: "",
    externalPiiDetail: "",
    employeePii: "",
    employeePiiDetail: "",
    integrates: "",
    integrations: [{ system: "", data: "" }],
    vendorDocs: "",
    vendorDocsLink: "",
  };
}

export function emptyVendor(): Vendor {
  return { name: "", website: "", contact: "", email: "", phone: "" };
}

export function emptyBudget(): BudgetDetails {
  return { category: "", businessUnit: "", product: "", region: "", engagementCode: "", salesforceCampaign: "" };
}

export function emptyDraft(): RequestDraft {
  return {
    category: "",
    additionalApprovers: [],
    details: emptyDetails(),
    vendors: [emptyVendor()],
    budget: emptyBudget(),
    budgetApproverId: "",
    notes: "",
    declarationAccepted: false,
  };
}

/** A rejected request, reopened for editing. The declaration must be made again on resubmit. */
export function draftFromRequest(request: PurchaseRequest): RequestDraft {
  return {
    category: request.category === "EVENTS" ? "" : request.category,
    additionalApprovers: request.additionalApprovers.map((email) => ({ id: email, name: email, email })),
    details: { ...request.details },
    vendors: request.vendors.length ? request.vendors.map((v) => ({ ...v })) : [emptyVendor()],
    budget: { ...request.budget },
    budgetApproverId: request.budgetApproverId,
    notes: request.notes,
    declarationAccepted: false,
  };
}

const blank = (value: string): boolean => value.trim() === "";

/** A count, when given, is a whole number the backend accepts. */
const invalidCount = (value: string): boolean => {
  if (blank(value)) return false;
  const n = Number(value);
  return !Number.isInteger(n) || n < 0 || n > MAX_PEOPLE_COUNT;
};

const labelIn = (list: readonly Choice[], value: string): string => list.find((c) => c.value === value)?.label ?? value;

/**
 * A budget as a person reads it: each code replaced by its label from the
 * lists. A code that is no longer listed is shown as it is.
 *
 * @param engagement - The engagement codes of the budget's business unit
 */
export function budgetForDisplay(budget: BudgetDetails, lookups: ProcurementLookups, engagement: readonly Choice[]): BudgetDetails {
  return {
    category: labelIn(lookups.budgetCategories, budget.category),
    businessUnit: labelIn(lookups.businessUnits, budget.businessUnit),
    product: labelIn(lookups.products, budget.product),
    region: labelIn(lookups.regions, budget.region),
    engagementCode: labelIn(engagement, budget.engagementCode),
    salesforceCampaign: budget.salesforceCampaign,
  };
}

/** A link the backend accepts: http or https, with no spaces. */
const validUrl = (value: string): boolean => /^https?:\/\/\S+$/.test(value.trim());

const IT_LINKS = [
  ["softwareUrl", "Software link"],
  ["pricingUrl", "Pricing link"],
  ["termsUrl", "Terms link"],
  ["privacyUrl", "Privacy link"],
  ["securityUrl", "Security link"],
] as const;

function itDetailsMissing(d: RequestDetails): string[] {
  const missing: string[] = [];
  if (blank(d.product)) missing.push("Product / solution name");
  if (blank(d.plan)) missing.push("Plan / subscription tier");
  if (blank(d.description)) missing.push("Description of the product / solution");
  if (!d.installationType) missing.push("Installation type");
  if (!d.licenseType) missing.push("Licence type");
  for (const [key, label] of IT_LINKS) if (!validUrl(d[key])) missing.push(`${label} (starting with http:// or https://)`);
  if (!d.urgent) missing.push("Urgency answer");
  if (d.urgent === "yes" && blank(d.urgencyJustification)) missing.push("Why the request is urgent");
  if (blank(d.usagePeriod)) missing.push("Expected usage period");
  if (blank(d.businessJustification)) missing.push("Business justification");
  if (!d.authorizedListChecked) missing.push("Authorised software list confirmation");
  if (!d.legitimacyConfirmed) missing.push("Legitimacy confirmation");
  if (d.installationType === "SAAS") missing.push(...saasDetailsMissing(d));
  return missing;
}

function saasDetailsMissing(d: RequestDetails): string[] {
  const missing: string[] = [];
  if (blank(d.userCount) || invalidCount(d.userCount)) missing.push("A whole number of users");
  if (d.userNames.length === 0) missing.push("User names");
  if (blank(d.adminCount) || invalidCount(d.adminCount)) missing.push("A whole number of administrators");
  if (d.adminNames.length === 0) missing.push("Administrator names");
  if (!d.sensitiveData) missing.push("Sensitive data answer");
  if (d.sensitiveData === "yes" && blank(d.sensitiveDataDetail)) missing.push("Sensitive data details");
  if (!d.externalPii) missing.push("External PII answer");
  if (d.externalPii === "yes" && blank(d.externalPiiDetail)) missing.push("External PII details");
  if (!d.employeePii) missing.push("Employee PII answer");
  if (d.employeePii === "yes" && blank(d.employeePiiDetail)) missing.push("Employee PII details");
  if (!d.integrates) missing.push("Integration answer");
  if (d.integrates === "yes") {
    if (!d.integrations.some((i) => !blank(i.system))) missing.push("Integration systems");
    if (!d.vendorDocs) missing.push("Vendor documentation answer");
    if (d.vendorDocs === "yes" && blank(d.vendorDocsLink)) missing.push("Documentation link");
  }
  return missing;
}

function nonItDetailsMissing(d: RequestDetails): string[] {
  const missing: string[] = [];
  if (blank(d.description)) missing.push("Details of goods / services");
  if (blank(d.businessJustification)) missing.push("Business justification");
  return missing;
}

function budgetMissing(draft: RequestDraft): string[] {
  const missing: string[] = [];
  if (draft.category === "NON-IT") {
    const b = draft.budget;
    if (blank(b.category)) missing.push("Budget category");
    if (blank(b.businessUnit)) missing.push("Business unit");
    if (blank(b.product)) missing.push("Product");
    if (blank(b.region)) missing.push("Region");
    if (blank(b.engagementCode)) missing.push("Engagement code");
    if (blank(draft.budgetApproverId)) missing.push("Budget approver");
  }
  return missing;
}

/**
 * What a step still needs, as the labels the person sees. Empty means the step is complete.
 *
 * @param me - The signed-in user, who may not approve their own request
 */
export function missingForStep(step: number, draft: RequestDraft, me: ProcurementMe): string[] {
  switch (step) {
    case STEP_REQUESTER: {
      // With no manager on record, the first additional approver becomes the team lead.
      if (!me.teamLead && !me.approvalExempt && draft.additionalApprovers.length === 0) {
        return ["a team lead or an additional approver"];
      }
      const notAllowed = draft.additionalApprovers.some(
        (a) => isSamePerson(a, me) || (me.teamLead !== null && isSamePerson(a, me.teamLead)),
      );
      return notAllowed ? ["additional approvers other than yourself and your team lead"] : [];
    }
    case STEP_CATEGORY:
      return draft.category ? [] : ["Procurement category"];
    case STEP_DETAILS:
      return draft.category === "IT"
        ? itDetailsMissing(draft.details)
        : draft.category === "NON-IT"
          ? nonItDetailsMissing(draft.details)
          : ["Procurement category"];
    case STEP_BUDGET:
      return budgetMissing(draft);
    default:
      return [];
  }
}

/** Every step before review, in order, with what each is missing; steps that are complete are left out. */
export function incompleteSteps(draft: RequestDraft, me: ProcurementMe): { step: number; missing: string[] }[] {
  return [STEP_REQUESTER, STEP_CATEGORY, STEP_DETAILS, STEP_BUDGET]
    .map((step) => ({ step, missing: missingForStep(step, draft, me) }))
    .filter((s) => s.missing.length > 0);
}

export function isSamePerson(a: Person, b: Person): boolean {
  return a.id === b.id || a.email.toLowerCase() === b.email.toLowerCase();
}

const cleanList = (values: string[]): string[] => values.map((v) => v.trim()).filter(Boolean);

/**
 * The request the backend is sent. The requester, status and dates are not in
 * it: the server takes them from the token and its own clock.
 *
 * @throws When the draft has no category; callers check `incompleteSteps` first
 */
export function draftToInput(draft: RequestDraft): PurchaseRequestInput {
  if (!draft.category) throw new Error("The request is incomplete.");
  const d = draft.details;
  return {
    category: draft.category,
    additionalApprovers: draft.additionalApprovers.map((a) => a.email),
    details: {
      ...d,
      userNames: cleanList(d.userNames),
      adminNames: cleanList(d.adminNames),
      integrations: d.integrates === "yes" ? d.integrations.filter((i) => !blank(i.system)) : [],
    },
    vendors: draft.vendors.filter((v) => !blank(v.name)),
    budget: draft.budget,
    budgetApproverId: draft.budgetApproverId,
    notes: draft.notes,
    declarationAccepted: draft.declarationAccepted,
  };
}
