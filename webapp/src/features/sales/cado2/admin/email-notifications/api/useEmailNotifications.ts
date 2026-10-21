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
import { cado2Send } from "@features/sales/cado2/api/cado2Http";

/**
 * The email notifications setting (D103). `enabled` is the Admin's switch;
 * `configured` says whether this environment can send email at all.
 */
export interface EmailNotificationsSetting {
  readonly enabled: boolean;
  readonly configured: boolean;
  readonly updatedByEmail: string | null;
  readonly updatedAt: string | null;
}

const DOMAIN = "admin-email-notifications";

export function useEmailNotifications(): UseQueryResult<EmailNotificationsSetting, Error> {
  const { getToken, ready, key } = useCado2Basis();
  return useQuery<EmailNotificationsSetting, Error>({
    queryKey: key(DOMAIN),
    queryFn: async () =>
      authedGet<EmailNotificationsSetting>(cado2ServiceUrls.adminEmailNotifications, await getToken()),
    enabled: ready,
    retry: httpRetry,
  });
}

/** Switches approval emails on or off; it applies to the next submit or decision. */
export function useSaveEmailNotifications() {
  const { getToken, key } = useCado2Basis();
  const queryClient = useQueryClient();
  return useMutation<EmailNotificationsSetting, Error, boolean>({
    mutationFn: async (enabled) =>
      cado2Send<EmailNotificationsSetting>("PUT", cado2ServiceUrls.adminEmailNotifications, await getToken(), {
        enabled,
      }),
    onSuccess: (saved) => queryClient.setQueryData(key(DOMAIN), saved),
  });
}
