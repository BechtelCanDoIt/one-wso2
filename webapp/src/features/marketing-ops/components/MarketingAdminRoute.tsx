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

import type { JSX } from "react";
import { Box } from "@wso2/oxygen-ui";
import { Navigate, Outlet } from "react-router";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { isMarketingOpsBackendConfigured } from "@config/apiConfig";
import { useMarketingOpsGate } from "../api/useMarketingOpsGate";

/**
 * Closes the Marketing Admin routes to callers outside the Marketing Ops admin
 * group. A layout route: the admin pages render through its Outlet.
 *
 * MarketingOpsShell alone isn't enough here. It checks general Marketing Ops
 * access, and it sits INSIDE the page — so by the time it decides, the page's own
 * settings queries have already gone to the backend. This decides first.
 *
 * Same ladder as the shell, so the states it shares mean the same thing:
 *   - no backend URL       → the page, whose shell says which config key is missing
 *   - /api/me in flight    → nothing yet, never a premature refusal
 *   - /api/me failed       → an error with a retry, not a refusal
 *   - not an admin         → back to /marketing-ops; the rail never offered this
 */
export default function MarketingAdminRoute(): JSX.Element | null {
  const configured = isMarketingOpsBackendConfigured();
  const gate = useMarketingOpsGate(configured);

  if (!configured) return <Outlet />;
  if (gate.isResolving) return null;

  if (gate.isError) {
    return (
      <Box sx={{ p: 2 }}>
        <ErrorNotice onRetry={gate.retry}>
          Couldn&apos;t check your Marketing Ops access. {gate.errorMessage}
        </ErrorNotice>
      </Box>
    );
  }

  if (!gate.isAdmin) return <Navigate to="/marketing-ops" replace />;

  return <Outlet />;
}
