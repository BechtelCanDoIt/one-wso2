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

import { authedGet, authedPost, authedPut, HttpError } from "@api/http";
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
  BackendCreatedRequest,
  BackendDirectoryUser,
  BackendEngagementOption,
  BackendReferenceItem,
  BackendRequestDetail,
  BackendRequestSummary,
  BackendTeamLeadResult,
  BackendUser,
} from "./backendTypes";
import {
  toBudgetApprovers,
  toChoices,
  toEngagementChoices,
  toMe,
  toNewRequest,
  toPerson,
  toRequest,
  toSummary,
} from "./backendMapping";
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
  submitRequest: (input: PurchaseRequestInput) => Promise<PurchaseRequest>;
  /** Edit a rejected request and send it back to the approvers. */
  resubmitRequest: (requestId: string, input: PurchaseRequestInput) => Promise<PurchaseRequest>;
  /** Withdraw a submitted or rejected request. */
  cancelRequest: (requestId: string) => Promise<PurchaseRequest>;
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
 * The backend saves a request as a draft and submits it in a second call. A submit that
 * fails after the draft was saved leaves the draft behind, so the next attempt of the same
 * user saves over it instead of leaving another draft in My Requests.
 */
function createHttpProcurementApi(getAccessToken: () => Promise<string>, user: Person): ProcurementApi {
  const get = async <T>(url: string): Promise<T> => authedGet<T>(url, await getAccessToken());
  let leftoverDraftId: string | null = null;

  const saveDraft = async (input: PurchaseRequestInput): Promise<string> => {
    const body = toNewRequest(input);
    if (leftoverDraftId) {
      try {
        await authedPut(urls.request(leftoverDraftId), await getAccessToken(), body);
        return leftoverDraftId;
      } catch (error) {
        const gone = error instanceof HttpError && (error.status === 404 || error.status === 409);
        if (!gone) throw error;
        leftoverDraftId = null;
      }
    }
    const created = await authedPost<BackendCreatedRequest>(urls.createRequest, await getAccessToken(), body);
    if (!created) throw new Error("The request could not be saved.");
    leftoverDraftId = String(created.id);
    return leftoverDraftId;
  };

  const submitSaved = async (requestId: string, declarationAccepted: boolean): Promise<PurchaseRequest> => {
    await authedPost(urls.submitRequest(requestId), await getAccessToken(), { commitmentConfirmed: declarationAccepted });
    return toRequest(await get<BackendRequestDetail>(urls.request(requestId)));
  };

  return {
    // A user who is not in the HR data gets an error from the team lead lookup, so the form cannot open for them.
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
    submitRequest: async (input) => {
      const requestId = await saveDraft(input);
      const submitted = await submitSaved(requestId, input.declarationAccepted);
      leftoverDraftId = null;
      return submitted;
    },
    resubmitRequest: async (requestId, input) => {
      await authedPut(urls.request(requestId), await getAccessToken(), toNewRequest(input));
      return submitSaved(requestId, input.declarationAccepted);
    },
    cancelRequest: async (requestId) => {
      await authedPost(urls.cancelRequest(requestId), await getAccessToken(), {});
      return toRequest(await get<BackendRequestDetail>(urls.request(requestId)));
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
  return isProcurementMockActive() ? createMockProcurementApi(user) : createHttpProcurementApi(getAccessToken, user);
}
