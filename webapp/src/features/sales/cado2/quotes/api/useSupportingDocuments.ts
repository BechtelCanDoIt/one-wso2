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

// Supporting documents (DGD-10): PDFs an Admin keeps in a library, which the
// AM ticks on a quote; Preview and Issue add them after the order form.
// Ticked on the quote, not a version (option B), so they change until Issue
// without a new approval.

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { cado2ServiceUrls } from "@config/apiConfig";
import { useCado2Basis } from "@features/sales/cado2/api/cado2Basis";
import { cado2Send } from "@features/sales/cado2/api/cado2Http";

/** A library document. */
export interface SupportingDocument {
  readonly id: number;
  readonly title: string;
  readonly pageCount: number;
  readonly sizeBytes: number;
  readonly fileName: string;
  readonly versionNumber: number;
  readonly retired: boolean;
  readonly updatedAt: string;
}

/** What a quote adds after its order form. */
export interface QuoteSupportingDocuments {
  /** Not issued: the ticked ones still in use. Issued: what the order form contains. */
  readonly documents: readonly { id: number; title: string; pageCount: number }[];
  /** Titles of ticked documents an Admin retired since: no longer added. */
  readonly retired: readonly string[];
  readonly issued: boolean;
  /** Someone who may change the quote, until it is issued or closed. */
  readonly canChange: boolean;
}

const LIBRARY = "supporting-documents";

/** The documents in use, in the library's order. */
export function useSupportingDocumentLibrary(): UseQueryResult<SupportingDocument[], Error> {
  const { getToken, ready, key } = useCado2Basis();
  return useQuery<SupportingDocument[], Error>({
    queryKey: key(LIBRARY),
    queryFn: async () => authedGet<SupportingDocument[]>(cado2ServiceUrls.supportingDocuments, await getToken()),
    enabled: ready,
    retry: httpRetry,
  });
}

/** What the quote adds after its order form. */
export function useQuoteSupportingDocuments(quoteId: number | null): UseQueryResult<QuoteSupportingDocuments, Error> {
  const { getToken, ready, key } = useCado2Basis();
  return useQuery<QuoteSupportingDocuments, Error>({
    queryKey: key("quotes", "supporting", quoteId),
    queryFn: async () =>
      authedGet<QuoteSupportingDocuments>(cado2ServiceUrls.quoteSupportingDocuments(quoteId as number), await getToken()),
    enabled: ready && quoteId !== null,
    staleTime: 0,
    refetchOnMount: "always",
    retry: httpRetry,
  });
}

/** Replaces the quote's ticks; the answer is the quote's view again. */
export function useSetQuoteSupportingDocuments(quoteId: number | null) {
  const { getToken, key } = useCado2Basis();
  const queryClient = useQueryClient();
  return useMutation<QuoteSupportingDocuments, Error, readonly number[]>({
    mutationFn: async (ids) =>
      cado2Send<QuoteSupportingDocuments>("PUT", cado2ServiceUrls.quoteSupportingDocuments(quoteId as number), await getToken(), {
        ids,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(key("quotes", "supporting", quoteId), data);
      void queryClient.invalidateQueries({ queryKey: key("quotes", "history", quoteId) });
    },
  });
}

/** "12 pages" / "1 page". */
export function pagesLabel(n: number): string {
  return `${n} page${n === 1 ? "" : "s"}`;
}

/** "820 KB" / "1.4 MB". */
export function sizeLabel(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Ticks a document on or off. */
export function toggled(ids: readonly number[], id: number, on: boolean): number[] {
  return on ? [...ids.filter((x) => x !== id), id] : ids.filter((x) => x !== id);
}

/**
 * Whether the quote page has anything to say about supporting documents:
 * some are ticked (or were, before an Admin retired them), or the caller may
 * tick some from a library that isn't empty.
 */
export function useHasSupportingDocuments(quoteId: number): boolean {
  const quote = useQuoteSupportingDocuments(quoteId);
  const library = useSupportingDocumentLibrary();
  const q = quote.data;
  if (!q) return false;
  return q.documents.length > 0 || q.retired.length > 0 || (q.canChange && (library.data?.length ?? 0) > 0);
}
