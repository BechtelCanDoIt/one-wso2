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
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpRetry } from "@api/errors";
import { authedGet, authedPost } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { isLegalBackendConfigured, legalServiceUrls } from "@config/apiConfig";

/** What the NDA page sends when an NDA is generated. */
export interface NdaRecordInput {
  template: string;
  wso2Entity: string;
  counterpartyName: string;
  counterpartyAddress: string;
  counterpartyCountry: string;
  source: "salesforce" | "manual";
  /** Set only for a Salesforce customer. */
  salesforceAccountId: string | null;
}

/** One generated NDA, as the legal backend stores it. */
export interface NdaRecord extends NdaRecordInput {
  id: number;
  /** ISO 8601, UTC. */
  generatedAt: string;
  generatedByEmail: string;
}

export interface NdaRecordPage {
  items: NdaRecord[];
  total: number;
  /** How many past days the list covers; older NDAs are kept but not listed. */
  days: number | null;
  /** The most past days the list may be asked for. */
  maxDays: number | null;
}

const RECORDS_KEY = ["legal", "ndas"] as const;

// Records a generated NDA. The page calls this before building the PDF and
// downloads nothing if it fails, so every downloaded NDA is in the records.
// Who generated it is taken from the token by the backend, not sent from here.
export function useRecordNda() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NdaRecordInput) => {
      const accessToken = await getAccessToken();
      return authedPost<NdaRecord>(legalServiceUrls.ndas, accessToken, input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECORDS_KEY }),
  });
}

// One page of the NDAs generated in the last `days` days, newest first. With
// days null the backend's default period applies. Only the Legal team may read
// it; the backend refuses anyone else, so pass enabled=false for them.
export function useNdaRecords(page: number, pageSize: number, enabled: boolean, days: number | null = null) {
  const getAccessToken = useAccessToken();

  return useQuery<NdaRecordPage>({
    queryKey: [...RECORDS_KEY, days, page, pageSize],
    enabled: enabled && isLegalBackendConfigured(),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      const params = new URLSearchParams({ limit: String(pageSize), offset: String(page * pageSize) });
      if (days !== null) params.set("days", String(days));
      const data = await authedGet<Partial<NdaRecordPage> | null>(`${legalServiceUrls.ndas}?${params}`, accessToken);
      if (!Array.isArray(data?.items)) throw new Error("Unexpected NDA records response");
      return {
        items: data.items,
        total: typeof data.total === "number" ? data.total : data.items.length,
        days: typeof data.days === "number" ? data.days : null,
        maxDays: typeof data.maxDays === "number" ? data.maxDays : null,
      };
    },
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
    // Fetch afresh every time the tab opens. The app's default (no refetch on
    // mount) would show the cached list without the NDA just generated, or
    // ones others generated since.
    refetchOnMount: "always",
    retry: httpRetry,
  });
}
