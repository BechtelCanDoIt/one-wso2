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

import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { cado2ServiceUrls } from "@config/apiConfig";
import { useCado2Basis } from "@features/sales/cado2/api/cado2Basis";
import type { ApprovalOperations, QuoteReport, QuoteSummary, ReportFilters } from "./insightsTypes";
import { reportQuery } from "../utils/reportFilters";

const DOMAIN = "insights";

/** Approval Operations, live: refreshed every minute while open. */
export function useApprovalOperations(region: string): UseQueryResult<ApprovalOperations, Error> {
  const { getToken, ready, key } = useCado2Basis();
  return useQuery<ApprovalOperations, Error>({
    queryKey: key(DOMAIN, "operations", region),
    queryFn: async () => {
      const qs = region ? `?region=${encodeURIComponent(region)}` : "";
      return authedGet<ApprovalOperations>(`${cado2ServiceUrls.insightsApprovalOperations}${qs}`, await getToken());
    },
    enabled: ready,
    retry: httpRetry,
    refetchInterval: 60_000,
  });
}

/** One page of the Quote Report. */
export function useQuoteReport(filters: ReportFilters, pageSize: number): UseQueryResult<QuoteReport, Error> {
  const { getToken, ready, key } = useCado2Basis();
  const qs = reportQuery(filters, filters.page, pageSize);
  return useQuery<QuoteReport, Error>({
    queryKey: key(DOMAIN, "report", qs),
    queryFn: async () => authedGet<QuoteReport>(`${cado2ServiceUrls.insightsQuotes}?${qs}`, await getToken()),
    enabled: ready,
    retry: httpRetry,
    placeholderData: keepPreviousData,
  });
}

/** Every matching row (up to the export cap), for CSV / Excel. */
export function useReportExportFetch(): (filters: ReportFilters, max: number) => Promise<QuoteReport> {
  const { getToken } = useCado2Basis();
  return async (filters, max) =>
    authedGet<QuoteReport>(`${cado2ServiceUrls.insightsQuotes}?${reportQuery(filters, 1, max)}`, await getToken());
}

/** One quote for the side panel; nothing is asked while none is open. */
export function useQuoteSummary(quoteId: number | null): UseQueryResult<QuoteSummary, Error> {
  const { getToken, ready, key } = useCado2Basis();
  return useQuery<QuoteSummary, Error>({
    queryKey: key(DOMAIN, "quote", quoteId),
    queryFn: async () => authedGet<QuoteSummary>(cado2ServiceUrls.insightsQuote(quoteId as number), await getToken()),
    enabled: ready && quoteId !== null,
    retry: httpRetry,
  });
}

