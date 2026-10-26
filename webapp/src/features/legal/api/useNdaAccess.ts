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

import { useQuery } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { isLegalBackendConfigured, legalServiceUrls } from "@config/apiConfig";

export interface NdaAccess {
  /** True when the caller may pick the other party from Salesforce. */
  canSearchSalesforce: boolean;
}

// What the signed-in user may do on the NDA page, asked of the legal backend
// (GET /me). The backend decides from its configured Asgardeo groups, so the
// group names live in one place, and it refuses a customer search from anyone
// else: this only decides what is worth showing.
export function useNdaAccess() {
  const getAccessToken = useAccessToken();

  return useQuery<NdaAccess>({
    queryKey: ["legal", "me"],
    enabled: isLegalBackendConfigured(),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      const data = await authedGet<{ canSearchSalesforce?: unknown } | null>(legalServiceUrls.me, accessToken);
      return { canSearchSalesforce: data?.canSearchSalesforce === true };
    },
    // Group membership is fixed for the life of the token.
    staleTime: 5 * 60 * 1000,
  });
}
