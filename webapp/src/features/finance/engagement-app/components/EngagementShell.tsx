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

import type { JSX, ReactNode } from "react";
import { Navigate, Outlet } from "react-router";
import { Alert, Box, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import { BriefcaseBusinessIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { NothingHere, PageTitle } from "@components/perspective-landing/PerspectiveLanding";
import { isEngagementAppBackendConfigured } from "@config/apiConfig";
import { useEngagementUserInfo } from "../api/useEngagementUserInfo";
import { engagementAccess, type EngagementAccess } from "../model/engagementAccess";
import { engagementPaths } from "../engagementPaths";
import { EA_SCOPE_SX } from "./eaStyles";
import { firstFinanceScreen, myLanding } from "../model/landing";

const NAME = "Engagement App";

/** The frame every Engagement App route renders in: resolves access once, in the order docs/conventions.md sets out, before any page asks for data. */
export default function EngagementShell({ area }: { area: "finance" | "me" }): JSX.Element {
  const info = useEngagementUserInfo();

  if (!isEngagementAppBackendConfigured()) {
    return (
      <Box>
        <PageTitle label={NAME} />
        <Alert severity="info" sx={{ mt: 1.5 }}>
          {NAME} isn&apos;t connected yet. Set <code>ONE_WSO2_ENGAGEMENT_APP_BACKEND_URL</code> in{" "}
          <code>public/config.js</code> and reload.
        </Alert>
      </Box>
    );
  }

  // isPending as well as isLoading: while the caller's identity is still
  // resolving the query is disabled, which React Query reports as pending only.
  if (info.isPending || info.isLoading) {
    return (
      <Box>
        <PageTitle label={NAME} />
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Checking your {NAME} access…
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (info.isError) {
    return (
      <Box>
        <PageTitle label={NAME} />
        <ErrorNotice onRetry={() => void info.refetch()} retrying={info.isFetching} error={info.error} sx={{ mt: 1.5 }}>
          Couldn&apos;t check your {NAME} access.
        </ErrorNotice>
      </Box>
    );
  }

  const access = engagementAccess(info.data);
  if (area === "finance" ? !access.anyFinance : !access.anyMe) {
    return (
      <Box>
        <PageTitle label={NAME} />
        <NothingHere label={NAME} icon={BriefcaseBusinessIcon} />
      </Box>
    );
  }

  return (
    <Box sx={EA_SCOPE_SX}>
      <Outlet />
    </Box>
  );
}

/** A screen-level question, in EngagementAccess's own terms. */
export type EngagementNeed = {
  [K in keyof EngagementAccess]-?: EngagementAccess[K] extends boolean ? K : never;
}[keyof EngagementAccess];

/** Guards one route inside the shell (which has already resolved /user-info). */
export function EngagementRequires({
  need,
  area = "finance",
  children,
}: {
  need: EngagementNeed | readonly EngagementNeed[];
  area?: "finance" | "me";
  children: ReactNode;
}): JSX.Element {
  const info = useEngagementUserInfo();
  const access = engagementAccess(info.data);
  const needs: readonly EngagementNeed[] = typeof need === "string" ? [need] : need;
  if (!needs.some((n) => access[n])) {
    return <Navigate to={area === "finance" ? engagementPaths.home : myLanding(access)} replace />;
  }
  return <>{children}</>;
}

/** `/finance/engagement-app`: the first screen this person may open. */
export function EngagementLanding(): JSX.Element {
  const info = useEngagementUserInfo();
  return <Navigate to={firstFinanceScreen(engagementAccess(info.data))} replace />;
}
