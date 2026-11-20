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

// The Create / Edit Engagement form's rules, field for field as the legacy form (EngagementForm getTypeSpecificProps): which type needs which field, how the Engagement Code is made, and the messages a refused Submit shows.

import type {
  AllocationTypeDef,
  Engagement,
  EngagementTypeId,
  FundingSource,
  Opportunity,
  OpportunityLineItem,
} from "../api/engagementTypes";
import type { EngagementInput } from "../api/useEngagementMutations";
import { isPaidType } from "./engagementAccess";

export interface FundingRow {
  region: string;
  subRegion: string;
  businessUnit: string;
  productUnit: string;
  percentage: string;
}

export interface EngagementFormState {
  typeId: EngagementTypeId | 0;
  accountId: string;
  accountName: string;
  opportunityId: string;
  lineItemId: string;
  campaignId: string;
  campaignName: string;
  title: string;
  description: string;
  allocationType: string;
  nature: string;
  country: string;
  address: string;
  businessUnit: string;
  productUnit: string;
  subRegion: string;
  funding: FundingRow[];
  start: string;
  end: string;
  tentative: boolean;
  contact: string;
  domain: string;
  scope: string;
  comment: string;
}

export const emptyFunding = (percentage = "100"): FundingRow => ({ region: "", subRegion: "", businessUnit: "", productUnit: "", percentage });

export function newForm(typeId: EngagementTypeId | 0): EngagementFormState {
  return {
    typeId,
    accountId: "",
    accountName: "",
    opportunityId: "",
    lineItemId: "",
    campaignId: "",
    campaignName: "",
    title: "",
    description: "",
    allocationType: "",
    nature: "",
    // Internal engagements and events default to Sri Lanka, as the legacy form did.
    country: typeId === 1 || typeId === 5 ? "Sri Lanka" : "",
    address: "",
    businessUnit: "",
    productUnit: "",
    subRegion: "",
    funding: [emptyFunding()],
    start: "",
    end: "",
    tentative: false,
    contact: "",
    domain: "",
    scope: "",
    comment: "",
  };
}

const toRow = (f: FundingSource): FundingRow => ({ ...f, percentage: String(f.percentage) });

/** The edit form, loaded from the engagement. */
export function formOf(e: Engagement): EngagementFormState {
  return {
    ...newForm(e.typeId),
    accountName: e.account,
    title: e.title,
    campaignId: e.campaign?.id ?? "",
    campaignName: e.campaign?.name ?? "",
    description: e.description ?? "",
    allocationType: e.allocationType,
    nature: e.nature,
    country: e.country,
    address: e.address ?? "",
    businessUnit: e.businessUnit ?? "",
    productUnit: e.productUnit ?? "",
    subRegion: e.subRegion ?? "",
    funding: e.funding?.length ? e.funding.map(toRow) : [emptyFunding()],
    start: e.start,
    end: e.end,
    tentative: Boolean(e.tentativeDates),
    contact: e.contact ?? "",
    domain: e.domain ?? "",
    scope: e.scope ?? "",
    comment: e.comment ?? "",
  };
}

export const isCustomerForm = (t: EngagementTypeId | 0): boolean => t !== 0 && t !== 1 && t !== 5;

/** The Engagement Code, as the legacy form made it: the line item's code for a paid type, the opportunity's pre-sales code for Non-Paid Pre Sale, the post-sales code with the allocation type's suffix for Non-Paid Post Sale, otherwise the allocation type's default code and suffix. */
export function engagementCode(
  f: Pick<EngagementFormState, "typeId" | "allocationType">,
  { opportunity, lineItem, allocationType }: { opportunity?: Opportunity; lineItem?: OpportunityLineItem; allocationType?: AllocationTypeDef },
): string {
  const t = f.typeId;
  if (t === 0) return "";
  if (isPaidType(t)) return lineItem?.code ?? "";
  if (t === 3) return opportunity?.preSalesCode ? opportunity.preSalesCode.split("(")[0].trim() : "";
  if (t === 4) return opportunity?.postSalesCode && allocationType ? `${opportunity.postSalesCode.split("-")[0]}-${allocationType.suffix || "GEN"}` : "";
  if (!allocationType) return "";
  return `${allocationType.code ?? ""}${allocationType.suffix ? `-${allocationType.suffix}` : ""}`;
}

export type FormErrors = Partial<Record<keyof EngagementFormState | "funding", string>>;

/** Whether the form's Business Unit, Product Unit and Sales Sub Region are required (see validateForm). */
export const needsFundingFields = (typeId: number, cust: boolean, paid: boolean, edit: boolean): boolean =>
  typeId !== 5 && !(cust && paid) && !edit;

/**
 * The legacy checks, in the legacy order. Empty when the form may be sent.
 * `accountHasSubRegion` is false when the picked Salesforce account has no Sales Sub Region: a paid customer
 * create then needs the form's (the backend takes the account's, else the form's).
 */
export function validateForm(
  f: EngagementFormState,
  { edit, campaignRequired, accountHasSubRegion = true }: { edit: boolean; campaignRequired: boolean; accountHasSubRegion?: boolean },
): FormErrors {
  const x: FormErrors = {};
  if (!f.typeId) {
    x.typeId = "Select the engagement type.";
    return x;
  }
  const cust = isCustomerForm(f.typeId);
  const paid = isPaidType(f.typeId);
  if (cust && !edit && !f.accountId) x.accountId = "Select an account from Salesforce.";
  if (cust && !edit && !f.opportunityId) x.opportunityId = "Select the opportunity.";
  if (cust && paid && !edit && !f.lineItemId) x.lineItemId = "Select the opportunity line item.";
  if (!cust && !f.title.trim()) x.title = f.typeId === 5 ? "Add the event name." : "Add the name or purpose.";
  if (f.typeId === 5 && campaignRequired && !f.campaignId) x.campaignId = "Select the campaign.";
  if (!f.allocationType) x.allocationType = "Select the allocation type.";
  if (!f.nature) x.nature = "Select the location.";
  if (!f.country) x.country = "Select the country.";
  if (!f.address.trim()) x.address = "Add the address.";
  // Customer (not paid) and internal engagements save one funding source from Business Unit, Product Unit and
  // Sales Sub Region, so the backend needs all three on create (engagementFundingRow).
  const fundingFromForm = needsFundingFields(f.typeId, cust, paid, edit);
  if ((fundingFromForm || f.typeId === 1) && !f.businessUnit) x.businessUnit = "Select the business unit.";
  if (fundingFromForm && !f.productUnit) x.productUnit = "Select the product unit.";
  if (fundingFromForm && !f.subRegion) x.subRegion = "Select the sales sub region.";
  if (cust && paid && !edit && f.accountId && !accountHasSubRegion && !f.subRegion) x.subRegion = "Select the sales sub region.";
  if (!paid && !f.start) x.start = "Add the start date.";
  if (!paid && !f.end) x.end = "Add the end date.";
  if (!paid && f.start && f.end && f.end < f.start) x.end = "The end date is before the start date.";
  if (cust && !f.contact.trim()) x.contact = "Add the customer contact.";
  if (f.typeId === 5) {
    const total = f.funding.reduce((s, r) => s + Number(r.percentage || 0), 0);
    if (f.funding.some((r) => !r.region || !r.businessUnit)) x.funding = "Every funding source needs a region and a business unit.";
    else if (f.funding.some((r) => Number(r.percentage) === 0)) x.funding = "A funding source cannot be 0%.";
    else if (total !== 100) x.funding = `Funding sources add up to ${total}%. They must total 100%.`;
  }
  return x;
}

/** What the form sends. Text keeps its line breaks and special characters. */
/** What the form sends, as EngagementCreate names it. */
export function inputOf(f: EngagementFormState, allocationTypeId: number | undefined): EngagementInput {
  const cust = isCustomerForm(f.typeId);
  return {
    engagementTypeId: f.typeId,
    ...(cust ? { accountId: f.accountId, opportunityId: f.opportunityId, opportunityLineItemId: f.lineItemId || undefined } : {}),
    ...(!cust ? { title: f.title.trim() } : {}),
    ...(f.typeId === 5 && f.campaignId ? { campaignId: f.campaignId } : {}),
    description: f.description || undefined,
    allocationTypeId,
    nature: f.nature,
    country: f.country,
    address: f.address,
    businessUnit: f.typeId === 5 ? undefined : f.businessUnit || undefined,
    productUnit: f.typeId === 5 ? undefined : f.productUnit || undefined,
    salesSubRegion: f.typeId === 5 ? undefined : f.subRegion || undefined,
    fundingSources:
      f.typeId === 5
        ? f.funding.map((r) => ({ region: r.region, subRegion: r.subRegion, businessUnit: r.businessUnit, productUnit: r.productUnit, percentage: Number(r.percentage) }))
        : undefined,
    startDate: f.start,
    endDate: f.end,
    customerContact: f.contact || undefined,
    businessDomain: f.domain || undefined,
    engagementScope: f.scope || undefined,
    comments: f.comment || undefined,
    tentativeDates: cust ? f.tentative : undefined,
  };
}

/** The form fields an edit may change, as the legacy edit form allowed, and the request field each one is. */
const EDITABLE: Readonly<Partial<Record<keyof EngagementFormState, readonly (keyof EngagementInput)[]>>> = {
  nature: ["nature"],
  address: ["address"],
  businessUnit: ["businessUnit"],
  productUnit: ["productUnit"],
  contact: ["customerContact"],
  scope: ["engagementScope"],
  comment: ["comments"],
  start: ["startDate"],
  end: ["endDate"],
  description: ["description"],
  title: ["title"],
  allocationType: ["allocationTypeId"],
  country: ["country"],
  subRegion: ["salesSubRegion"],
  funding: ["fundingSources"],
  campaignId: ["campaignId"],
};

/** The changed fields of an edit, as the PATCH body (EngagementUpdate). Empty when nothing changed. */
export function changesOf(orig: EngagementFormState, now: EngagementFormState, allocationTypeId?: number): Partial<EngagementInput> {
  const full = inputOf(now, allocationTypeId) as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [field, keys] of Object.entries(EDITABLE) as [keyof EngagementFormState, readonly string[]][]) {
    if (JSON.stringify(orig[field]) === JSON.stringify(now[field])) continue;
    for (const k of keys) out[k] = full[k];
  }
  return out as Partial<EngagementInput>;
}
