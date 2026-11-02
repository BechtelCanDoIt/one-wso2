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

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { cado2ServiceUrls } from "@config/apiConfig";
import { useCado2Basis } from "@features/sales/cado2/api/cado2Basis";
import { cado2Pdf, cado2Send, cado2Upload } from "@features/sales/cado2/api/cado2Http";
import type { SupportingDocument } from "@features/sales/cado2/quotes/api/useSupportingDocuments";

const DOMAIN = "supporting-documents-admin";

/** Admin › Supporting Documents: the whole library, retired ones included. */
export function useSupportingDocumentsAdmin(): UseQueryResult<SupportingDocument[], Error> {
  const { getToken, ready, key } = useCado2Basis();
  return useQuery<SupportingDocument[], Error>({
    queryKey: key(DOMAIN),
    queryFn: async () => authedGet<SupportingDocument[]>(cado2ServiceUrls.adminSupportingDocuments, await getToken()),
    enabled: ready,
    retry: httpRetry,
  });
}

/** One change on the page; every answer is the whole library again. */
export type SupportingDocumentChange =
  | { kind: "add"; title: string; file: File }
  | { kind: "replace"; id: number; file: File }
  | { kind: "rename"; id: number; title: string }
  | { kind: "retire" | "restore"; id: number }
  | { kind: "order"; ids: readonly number[] };

/**
 * Applies one SupportingDocumentChange (add, replace, rename, retire,
 * restore or order). The answer is the whole library, which replaces the
 * cached one; the AMs' library and quotes' selections are refetched.
 */
export function useSupportingDocumentsChange() {
  const { getToken, key } = useCado2Basis();
  const queryClient = useQueryClient();
  return useMutation<SupportingDocument[], Error, SupportingDocumentChange>({
    mutationFn: async (c) => {
      const token = await getToken();
      const u = cado2ServiceUrls;
      switch (c.kind) {
        case "add": {
          const form = new FormData();
          form.append("title", c.title);
          form.append("file", c.file, c.file.name);
          return cado2Upload<SupportingDocument[]>(u.adminSupportingDocuments, token, form);
        }
        case "replace": {
          const form = new FormData();
          form.append("file", c.file, c.file.name);
          return cado2Upload<SupportingDocument[]>(u.adminSupportingDocument(c.id, "versions"), token, form);
        }
        case "rename":
          return cado2Send<SupportingDocument[]>("PUT", u.adminSupportingDocument(c.id), token, { title: c.title });
        case "retire":
        case "restore":
          return cado2Send<SupportingDocument[]>("POST", u.adminSupportingDocument(c.id, c.kind), token, {});
        case "order":
          return cado2Send<SupportingDocument[]>("PUT", u.adminSupportingDocumentsOrder, token, { ids: c.ids });
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key(DOMAIN), data);
      // AMs pick from the same library, and quotes show its titles.
      void queryClient.invalidateQueries({ queryKey: key("supporting-documents") });
      void queryClient.invalidateQueries({ queryKey: key("quotes", "supporting") });
    },
  });
}

/** Opens a document's newest file, for the Admin to check. */
export function useSupportingDocumentFile() {
  const { getToken } = useCado2Basis();
  return async (id: number): Promise<Blob> => cado2Pdf("GET", cado2ServiceUrls.adminSupportingDocument(id, "file"), await getToken());
}
