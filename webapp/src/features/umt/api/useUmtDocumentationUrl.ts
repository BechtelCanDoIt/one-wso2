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

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAsgardeo } from "@asgardeo/react";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { umtServiceUrls, isUmtBackendConfigured } from "@config/apiConfig";
import { useAccessToken } from "@hooks/useAccessToken";
import { rememberUmtDocumentationUrl } from "../lib/umtDocumentation";
import type { UmtDocumentation } from "./umtTypes";

// GET /update/documentation — the Update Manager documentation link configured
// for this environment. The rail's UMT "Documentation" row opens it, so the row
// needs it before it can be shown; it is also handed to openUmtDocumentation,
// which the row runs when chosen.
//
// Undefined until it arrives, and also when the backend has none configured:
// there is nowhere for the row to go in either case. The link is deployment
// configuration, the same for every caller, so the key is not per user and it
// is fetched once per session.
export function useUmtDocumentationUrl(enabled = true): string | undefined {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const configured = isUmtBackendConfigured();

  const query = useQuery<string>({
    queryKey: ["umt-documentation-url"],
    enabled: enabled && isSignedIn && configured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      const { url } = await authedGet<UmtDocumentation>(umtServiceUrls.documentation, accessToken);
      return url?.trim() ?? "";
    },
    staleTime: Infinity,
    retry: httpRetry,
  });

  const url = query.data || undefined;
  // An effect, not a write during render: React may render this more than once
  // per commit.
  useEffect(() => {
    rememberUmtDocumentationUrl(url);
  }, [url]);

  return url;
}
