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

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { isAmplifyBackendConfigured } from "@config/apiConfig";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { useAmplifyGate, type AmplifyGate } from "../api/useAmplifyGate";

/**
 * The frame every Amplify screen renders inside, and the one place the module's
 * four shared states are handled: not connected, checking access, access check
 * failed, and no access.
 *
 * `requireRole` lets a screen declare which Amplify role it needs beyond being
 * signed in — the route/rail already hide it, but a typed URL must still get a
 * sentence rather than a blank page or a wall of failed requests. The backend
 * enforces it regardless; this is the legible answer for someone who typed it.
 */
export default function AmplifyShell({
  title,
  subtitle,
  requireRole,
  children,
}: {
  title: string;
  subtitle?: string;
  requireRole?: "po" | "marketing" | "slt" | "admin";
  children: (gate: AmplifyGate) => ReactNode;
}) {
  const configured = isAmplifyBackendConfigured();
  const gate = useAmplifyGate(configured);

  const missingRole =
    gate.isAuthorized && requireRole !== undefined && !roleSatisfied(gate, requireRole);

  return (
    <Box>
      <Typography component="h1" variant="h5" sx={{ mb: 0.5, mt: 0 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25, maxWidth: "70ch" }}>
          {subtitle}
        </Typography>
      )}

      {!configured ? (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          Amplify isn't connected yet. Set <code>ONE_WSO2_AMPLIFY_BACKEND_URL</code> in{" "}
          <code>public/config.js</code> (the API proxy URL) and reload.
        </Alert>
      ) : gate.isResolving ? (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Checking your Amplify access…
          </Typography>
        </Stack>
      ) : gate.isError ? (
        <ErrorNotice onRetry={gate.retry} sx={{ mt: 1.5 }}>
          Couldn't check your Amplify access. {gate.errorMessage}
        </ErrorNotice>
      ) : !gate.isAuthorized ? (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          Amplify isn't available for your account. Ask the Amplify team if you
          think you should have access.
        </Alert>
      ) : missingRole ? (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          This screen is for the Amplify {requireRole} role. You can still use the
          rest of Amplify.
        </Alert>
      ) : (
        <>{children(gate)}</>
      )}
    </Box>
  );
}

function roleSatisfied(gate: AmplifyGate, role: NonNullable<Parameters<typeof AmplifyShell>[0]["requireRole"]>): boolean {
  switch (role) {
    case "po":
      return gate.isPo || gate.isAdmin;
    case "marketing":
      return gate.isMarketing || gate.isAdmin;
    case "slt":
      return gate.isSlt || gate.isAdmin;
    case "admin":
      return gate.isAdmin;
  }
}

/**
 * The module's dependency-down snackbar. Any Amplify query that fails because
 * the backend is unreachable lands here as a transient banner rather than a
 * page-level error — used by the smaller widgets (the Me overview bar) where a
 * full ErrorNotice would be out of proportion.
 */
export function useAmplifyDependencyNotice(isError: boolean, message: string): void {
  const { showError } = useNotifications();
  // Fire once per transition into the failed state, not on every render — a
  // re-render while isError stays true must not re-enqueue the same banner.
  const wasError = useRef(false);
  useEffect(() => {
    if (isError && !wasError.current) showError(message);
    wasError.current = isError;
  }, [isError, message, showError]);
}

/** A small labelled figure, used by the dashboard and leaderboard tiles. */
export function AmplifyStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box>
      <Typography variant="h5" sx={{ lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

/** The "nothing here" card, so an empty list reads the same everywhere. */
export function AmplifyEmpty({ children }: { children: ReactNode }) {
  return (
    <Alert severity="info" sx={{ mt: 1.5 }}>
      {children}
    </Alert>
  );
}
