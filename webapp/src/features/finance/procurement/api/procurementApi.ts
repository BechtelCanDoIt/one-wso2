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

// The seam between Procurement's screens and wherever its data comes from.
// Screens and hooks talk to `ProcurementApi` only; nothing else in the feature
// builds a URL or knows a mock exists.

import { authedGet } from "@api/http";
import { isProcurementBackendConfigured, procurementServiceUrls as urls } from "@config/apiConfig";
import { isPreviewEnabled } from "@config/previewFeatures";
import type {
  BudgetApproverOption,
  Choice,
  Person,
  ProcurementLookups,
  ProcurementMe,
  PurchaseRequest,
  PurchaseRequestInput,
  RequestSummary,
} from "../types";
import type {
  BackendBudgetApprover,
  BackendDirectoryUser,
  BackendEngagementOption,
  BackendReferenceItem,
  BackendRequestDetail,
  BackendRequestSummary,
  BackendTeamLeadResult,
  BackendUser,
} from "./backendTypes";
import { toBudgetApprovers, toChoices, toEngagementChoices, toMe, toPerson, toRequest, toSummary } from "./backendMapping";
import { createMockProcurementApi } from "./mockProcurementApi";

export interface ProcurementApi {
  getMe: () => Promise<ProcurementMe>;
  getLookups: () => Promise<ProcurementLookups>;
  /** Approvers who cover the business unit (by code) or the region (by code); none when neither is given. */
  getBudgetApprovers: (scope: { businessUnit: string; region: string }) => Promise<BudgetApproverOption[]>;
  /** Engagement codes funded by a business unit, asked for by the unit's name; none when no unit is given. */
  getEngagementCodes: (businessUnitName: string) => Promise<Choice[]>;
  /**
   * Employees whose email starts with `query`; name and email only, capped by the backend.
   *
   * @param leadsOnly - Keep only leads, who are the people who can approve a request
   */
  searchDirectory: (query: string, leadsOnly: boolean) => Promise<Person[]>;
  listMyRequests: () => Promise<RequestSummary[]>;
  getRequest: (requestId: string) => Promise<PurchaseRequest>;
  submitRequest: (input: PurchaseRequestInput, files: File[]) => Promise<PurchaseRequest>;
  /** Edit a rejected request and send it back to the approvers. */
  resubmitRequest: (requestId: string, input: PurchaseRequestInput, files: File[]) => Promise<PurchaseRequest>;
}

/** Whether a dev build should serve sample data in place of the missing backend. */
export function isProcurementMockActive(): boolean {
  return import.meta.env.DEV && isPreviewEnabled("procurement") && !isProcurementBackendConfigured();
}

/** Whether Procurement has any data source at all; false means "not connected". */
export function isProcurementAvailable(): boolean {
  return isProcurementBackendConfigured() || isProcurementMockActive();
}

/** The lists the form draws its budget fields from, as the backend names them. */
const REFERENCE_TYPES = ["BUDGET_CATEGORY", "BUSINESS_UNIT", "PRODUCT", "REGION"] as const;

/** My Requests shows one page of this many, the most the backend allows. */
const REQUEST_PAGE_SIZE = 100;

/**
 * Reads come from the backend. Submitting is still the sample-data double: the
 * backend saves a draft and submits it in two calls and stores different content
 * than the form collects, which is the next piece of work. Until then a submit
 * does not reach the backend, and resubmitting a real request is refused.
 */
function createHttpProcurementApi(
  getAccessToken: () => Promise<string>,
  user: Person,
  submitting: ProcurementApi,
): ProcurementApi {
  const get = async <T>(url: string): Promise<T> => authedGet<T>(url, await getAccessToken());
  return {
    getMe: async () => {
      const [backendUser, lead] = await Promise.all([get<BackendUser>(urls.me), get<BackendTeamLeadResult>(urls.meTeamLead)]);
      return toMe(backendUser, lead, user);
    },
    getLookups: async () => {
      const [budgetCategories, businessUnits, products, regions] = await Promise.all(
        REFERENCE_TYPES.map((type) => get<BackendReferenceItem[]>(urls.referenceData(type))),
      );
      return {
        budgetCategories: toChoices(budgetCategories),
        businessUnits: toChoices(businessUnits),
        products: toChoices(products),
        regions: toChoices(regions),
      };
    },
    getBudgetApprovers: async ({ businessUnit, region }) =>
      businessUnit || region ? toBudgetApprovers(await get<BackendBudgetApprover[]>(urls.budgetApprovers(businessUnit, region))) : [],
    getEngagementCodes: async (businessUnitName) =>
      businessUnitName ? toEngagementChoices(await get<BackendEngagementOption[]>(urls.engagementCodes(businessUnitName))) : [],
    searchDirectory: async (query, leadsOnly) =>
      (await get<BackendDirectoryUser[]>(urls.directoryEmployees(query, leadsOnly))).map(toPerson),
    listMyRequests: async () => (await get<BackendRequestSummary[]>(urls.requests(REQUEST_PAGE_SIZE))).map(toSummary),
    getRequest: async (requestId) => toRequest(await get<BackendRequestDetail>(urls.request(requestId))),
    submitRequest: (input, files) => submitting.submitRequest(input, files),
    resubmitRequest: async () => {
      throw new Error("Resubmitting is not connected to the backend yet.");
    },
  };
}

/**
 * The API for the signed-in user.
 *
 * @param getAccessToken - Resolves the current access token
 * @param user - The signed-in user's identity, which the sample data stands in for the backend with
 */
export function createProcurementApi(getAccessToken: () => Promise<string>, user: Person): ProcurementApi {
  const sample = createMockProcurementApi(user);
  return isProcurementMockActive() ? sample : createHttpProcurementApi(getAccessToken, user, sample);
}
