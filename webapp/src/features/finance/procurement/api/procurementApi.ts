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

import { authedGet, authedPost, authedPut, fetchWithReauth } from "@api/http";
import {
  isProcurementBackendConfigured,
  procurementServiceUrls as urls,
} from "@config/apiConfig";
import { isPreviewEnabled } from "@config/previewFeatures";
import type {
  Person,
  ProcurementLookups,
  ProcurementMe,
  PurchaseRequest,
  PurchaseRequestInput,
} from "../types";
import { createMockProcurementApi } from "./mockProcurementApi";

export interface ProcurementApi {
  getMe: () => Promise<ProcurementMe>;
  getLookups: () => Promise<ProcurementLookups>;
  /** Employees whose name or email starts with `query`; name and email only, capped by the backend. */
  searchDirectory: (query: string) => Promise<Person[]>;
  listMyRequests: () => Promise<PurchaseRequest[]>;
  getRequest: (requestId: string) => Promise<PurchaseRequest>;
  submitRequest: (input: PurchaseRequestInput, files: File[]) => Promise<PurchaseRequest>;
  /** Edit a rejected request and send it back to the team lead. */
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

async function uploadDocuments(requestId: string, files: File[], accessToken: string): Promise<void> {
  for (const file of files) {
    const body = new FormData();
    body.append("file", file);
    const res = await fetchWithReauth(urls.requestDocuments(requestId), { method: "POST", body }, accessToken);
    if (!res.ok) throw new Error(`"${file.name}" could not be uploaded.`);
  }
}

function createHttpProcurementApi(getAccessToken: () => Promise<string>): ProcurementApi {
  return {
    getMe: async () => authedGet<ProcurementMe>(urls.me, await getAccessToken()),
    getLookups: async () => authedGet<ProcurementLookups>(urls.lookups, await getAccessToken()),
    searchDirectory: async (query) => authedGet<Person[]>(urls.directory(query), await getAccessToken()),
    listMyRequests: async () => authedGet<PurchaseRequest[]>(urls.requests, await getAccessToken()),
    getRequest: async (requestId) => authedGet<PurchaseRequest>(urls.request(requestId), await getAccessToken()),
    submitRequest: async (input, files) => {
      const token = await getAccessToken();
      const created = await authedPost<PurchaseRequest>(urls.requests, token, input);
      if (!created) throw new Error("The request was not created.");
      await uploadDocuments(created.id, files, token);
      return created;
    },
    resubmitRequest: async (requestId, input, files) => {
      const token = await getAccessToken();
      const updated = await authedPut<PurchaseRequest>(urls.request(requestId), token, input);
      if (!updated) throw new Error("The request was not updated.");
      await uploadDocuments(requestId, files, token);
      return updated;
    },
  };
}

/**
 * The API for the signed-in user.
 *
 * @param getAccessToken - Resolves the current access token
 * @param user - The signed-in user's identity, which the mock stands in for the backend with
 */
export function createProcurementApi(getAccessToken: () => Promise<string>, user: Person): ProcurementApi {
  return isProcurementMockActive() ? createMockProcurementApi(user) : createHttpProcurementApi(getAccessToken);
}
