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

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { cado2ServiceUrls } from "@config/apiConfig";
import { useCado2Basis } from "@features/sales/cado2/api/cado2Basis";
import type { DeskColumn, DeskColumnKey } from "./deskTypes";

/**
 * One column of the Deal Desk board (D130). `query` is the board's filters
 * with the column's sort, quick filter and page; the previous page stays on
 * screen while the next loads.
 */
export function useDeskColumn(column: DeskColumnKey, query: string) {
  const { getToken, ready, key } = useCado2Basis();
  return useQuery<DeskColumn, Error>({
    queryKey: key("desk", column, query),
    queryFn: async () => authedGet<DeskColumn>(cado2ServiceUrls.deskColumn(column, query), await getToken()),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: "always",
    retry: httpRetry,
  });
}
