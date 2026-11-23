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
  EventCostCategory,
  EventDetails,
  PackageInclusion,
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

/** How long the software is expected to be used. The backend keeps it as free text, so it is not a looked-up list. */
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
  { value: "SAAS", label: "SaaS or Online" },
  { value: "STANDALONE", label: "Standalone" },
  { value: "BROWSER_EXTENSION", label: "Web browser extension" },
  { value: "PLUGIN", label: "Software plugin" },
  { value: "PORTABLE", label: "Portable application" },
];

export const EVENT_TYPES: readonly Choice[] = [
  { value: "INDUSTRY_EVENT_SPONSORSHIP", label: "Industry event sponsorship" },
  { value: "WSO2CON", label: "WSO2CON" },
  { value: "WSO2_SUMMIT", label: "WSO2 Summit" },
  { value: "OXYGENATE", label: "Oxygenate" },
  { value: "ROUNDTABLE_LUNCH_AND_LEARN", label: "Roundtable & Lunch & Learn" },
  { value: "OTHER_MARKETING_EVENT", label: "Other marketing events" },
];

export const PACKAGE_INCLUSIONS: readonly { value: PackageInclusion; label: string }[] = [
  { value: "BOOTH_SPACE", label: "Booth space" },
  { value: "DELEGATE_PASSES", label: "Delegate passes" },
  { value: "SPEAKING_SLOT", label: "Speaking slot" },
  { value: "LEAD_SCANNING", label: "Lead scanning" },
  { value: "LOGO_PLACEMENT", label: "Logo placement" },
  { value: "ATTENDEE_LIST", label: "Attendee list" },
  { value: "SPONSORED_SESSION", label: "Sponsored session" },
];

export const EVENT_COSTS: readonly { value: EventCostCategory; label: string }[] = [
  { value: "SPONSORSHIP_FEE", label: "Sponsorship fee" },
  { value: "BOOTH_BUILD_AND_DESIGN", label: "Booth build and design" },
  { value: "TRAVEL_AND_ACCOMMODATION", label: "Travel and accommodation (estimate)" },
  { value: "SWAG", label: "SWAG" },
  { value: "PRINT_AND_BANNERS", label: "Print and banners" },
  { value: "PAYMENT_TO_PARTNER", label: "Payment to partner" },
];

/** How many times its total investment an event has to return as new pipeline. */
export const REQUIRED_PIPELINE_MULTIPLE = 4;

export const REQUEST_STEPS = ["Requester details", "Procurement category", "Requirement details", "Vendor & budget", "Review & submit"] as const;

/** The requirement step's title, which names the category once one is chosen. */
export function detailsLabel(category: RequestDraft["category"]): string {
  return category === "IT"
    ? "IT requirement details"
    : category === "NON-IT"
      ? "Non-IT requirement details"
      : category === "EVENTS"
        ? "Event details"
        : "Requirement details";
}

/** The budget step's title: an event has no vendors to ask for. */
export function budgetLabel(category: RequestDraft["category"]): string {
  return category === "EVENTS" ? "Budget" : "Vendor & budget";
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
  event: EventDetails;
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
    softwareRequirement: "",
    installationType: "",
    userCount: "",
    userNames: [],
    adminCount: "",
    adminNames: [],
    usagePeriod: "",
    externalInteraction: "",
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

export function emptyEvent(): EventDetails {
  return {
    eventType: "",
    shortlisted: "",
    shortlistLineId: "",
    name: "",
    startDate: "",
    endDate: "",
    audience: "",
    packageName: "",
    packageInclusions: [],
    prospectusUrl: "",
    costs: { SPONSORSHIP_FEE: "", BOOTH_BUILD_AND_DESIGN: "", TRAVEL_AND_ACCOMMODATION: "", SWAG: "", PRINT_AND_BANNERS: "", PAYMENT_TO_PARTNER: "" },
    otherCosts: [{ description: "", amount: "" }],
    partnerInvestmentPercent: "",
    targetAccounts: "",
    keyAccounts: "",
    newPipeline: "",
    roiCalculatorUrl: "",
    attendedBefore: "",
    previousCost: "",
    previousPipeline: "",
    brandGoal: "",
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
    event: emptyEvent(),
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
    category: request.category,
    additionalApprovers: request.additionalApprovers.map((email) => ({ id: email, name: email, email })),
    details: { ...request.details },
    event: {
      ...request.event,
      costs: { ...request.event.costs },
      otherCosts: request.event.otherCosts.length ? request.event.otherCosts.map((c) => ({ ...c })) : [{ description: "", amount: "" }],
      packageInclusions: [...request.event.packageInclusions],
    },
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

function itDetailsMissing(d: RequestDetails): string[] {
  const missing: string[] = [];
  if (blank(d.product)) missing.push("Product / solution name");
  if (blank(d.plan)) missing.push("Plan / subscription tier");
  if (blank(d.description)) missing.push("Description of the product / solution");
  if (blank(d.softwareRequirement)) missing.push("Requirement to use this software");
  if (!d.installationType) missing.push("Installation type");
  if (blank(d.usagePeriod)) missing.push("Expected usage period");
  if (blank(d.businessJustification)) missing.push("Business justification");
  missing.push(...saasDetailsMissing(d));
  return missing;
}

function saasDetailsMissing(d: RequestDetails): string[] {
  const missing: string[] = [];
  if (!d.externalInteraction) missing.push("External interaction answer");
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

const parseAmount = (value: string): number => (blank(value) ? NaN : Number(value));

/** An amount is not negative and has at most two decimals. */
const invalidAmount = (value: string): boolean => {
  if (blank(value)) return false;
  const n = Number(value);
  return !Number.isFinite(n) || n < 0 || Math.round(n * 100) / 100 !== n;
};

const invalidLink = (value: string): boolean => {
  if (blank(value)) return false;
  try {
    return !["http:", "https:"].includes(new URL(value.trim()).protocol);
  } catch {
    return true;
  }
};

/** The event's total investment: its cost lines added up, a blank or invalid line counting as nothing. */
export function totalInvestment(costs: EventDetails["costs"], otherCosts: EventDetails["otherCosts"]): number {
  const amounts = [...Object.values(costs), ...otherCosts.map((c) => c.amount)];
  const cents = amounts.reduce((sum, value) => sum + (Number.isFinite(parseAmount(value)) ? Math.round(parseAmount(value) * 100) : 0), 0);
  return cents / 100;
}

/** A share, when given, is a whole number from 0 to 100. */
const invalidPercent = (value: string): boolean => {
  if (blank(value)) return false;
  const n = Number(value);
  return !Number.isInteger(n) || n < 0 || n > 100;
};

function eventDetailsMissing(e: EventDetails): string[] {
  const missing: string[] = [];
  if (!e.eventType) missing.push("Event type");
  if (!e.shortlisted) missing.push("Whether the event is on the shortlist");
  if (e.shortlisted === "yes" && blank(e.shortlistLineId)) missing.push("Shortlist Line ID");
  if (blank(e.name)) missing.push("Event name");
  if (blank(e.startDate) || blank(e.endDate)) missing.push("Event dates");
  else if (e.endDate < e.startDate) missing.push("An end date on or after the start date");
  if (blank(e.audience)) missing.push("Main audience");
  const industry = e.eventType === "INDUSTRY_EVENT_SPONSORSHIP";
  if (industry) {
    if (blank(e.packageName)) missing.push("Sponsorship package name");
    if (invalidLink(e.prospectusUrl)) missing.push("A valid prospectus link");
  }
  if (Object.values(e.costs).some(invalidAmount) || e.otherCosts.some((c) => invalidAmount(c.amount))) {
    missing.push("Costs that are not negative, with at most two decimals");
  }
  if (e.otherCosts.some((c) => !blank(c.amount) && blank(c.description))) missing.push("A description for each other cost");
  if (invalidPercent(e.partnerInvestmentPercent)) missing.push("A partner investment share from 0 to 100");
  const total = totalInvestment(e.costs, e.otherCosts);
  if (total <= 0) missing.push("At least one cost");
  if (e.shortlisted === "yes") return missing;
  if (industry) {
    if (!e.attendedBefore) missing.push("Whether the event was attended before");
    if (e.attendedBefore === "yes") {
      if (blank(e.previousCost) || invalidAmount(e.previousCost)) missing.push("What the earlier attendance cost");
      if (blank(e.previousPipeline) || invalidAmount(e.previousPipeline)) missing.push("The pipeline the earlier attendance created");
    }
  }
  const accounts = parseAmount(e.targetAccounts);
  if (blank(e.targetAccounts) || !Number.isInteger(accounts) || accounts < 0) missing.push("A whole number of target accounts");
  else if (accounts > 0 && blank(e.keyAccounts)) missing.push("Key target accounts");
  const pipeline = parseAmount(e.newPipeline);
  if (blank(e.newPipeline) || invalidAmount(e.newPipeline)) missing.push("New pipeline amount");
  if (blank(e.roiCalculatorUrl) || invalidLink(e.roiCalculatorUrl)) missing.push("A valid ROI calculator link");
  if (Number.isFinite(pipeline) && total > 0 && pipeline < total * REQUIRED_PIPELINE_MULTIPLE) {
    missing.push(`New pipeline of at least ${REQUIRED_PIPELINE_MULTIPLE}x the total investment`);
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
  if (draft.category === "NON-IT" || draft.category === "EVENTS") {
    const b = draft.budget;
    if (blank(b.category)) missing.push("Budget category");
    if (blank(b.businessUnit)) missing.push("Business unit");
    if (blank(b.product)) missing.push("Product");
    if (blank(b.region)) missing.push("Region");
    if (blank(b.engagementCode)) missing.push("Engagement code");
    if (draft.category === "NON-IT" && blank(draft.budgetApproverId)) missing.push("Budget approver");
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
          : draft.category === "EVENTS"
            ? eventDetailsMissing(draft.event)
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
    event: draft.event,
    vendors: draft.category === "EVENTS" ? [] : draft.vendors.filter((v) => !blank(v.name)),
    budget: draft.budget,
    budgetApproverId: draft.category === "EVENTS" ? "" : draft.budgetApproverId,
    notes: draft.category === "EVENTS" && draft.event.shortlisted === "yes" ? "" : draft.notes,
    declarationAccepted: draft.declarationAccepted,
  };
}
