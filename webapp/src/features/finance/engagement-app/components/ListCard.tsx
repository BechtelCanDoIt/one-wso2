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
import { Box, Card, Typography } from "@wso2/oxygen-ui";
import { InboxIcon } from "@wso2/oxygen-ui-icons-react";
import EmptyState from "@features/sales/cado2/components/empty-state/EmptyState";
import { eaError } from "../api/engagementHttp";
import ErrorNotice from "@components/error-notice/ErrorNotice";

/** The card a list, its tab bar and its toolbar sit in. */
export function ListCard({ children, spaced = false }: { readonly children: ReactNode; readonly spaced?: boolean }): JSX.Element {
  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, ...(spaced ? { my: 2 } : {}) }}>
      {children}
    </Card>
  );
}

/** An empty list that says why and, where there is one, offers the next step: never a bare "no rows". */
export function Empty({ title, body, action }: { readonly title: string; readonly body?: ReactNode; readonly action?: ReactNode }): JSX.Element {
  return <EmptyState compact icon={<InboxIcon size={20} />} title={title} body={body} action={action} />;
}

/** A query that failed blanks only its own part, with Retry. */
export function Failed({
  what,
  error,
  onRetry,
  retrying,
}: {
  readonly what: string;
  readonly error: unknown;
  readonly onRetry: () => void;
  readonly retrying?: boolean;
}): JSX.Element {
  return (
    <ErrorNotice error={eaError(error)} onRetry={onRetry} retrying={retrying} sx={{ my: 1 }}>
      Couldn&apos;t load {what}.
    </ErrorNotice>
  );
}

/** A labelled section heading inside a page or card. */
export function SectionTitle({ children, aside }: { readonly children: ReactNode; readonly aside?: ReactNode }): JSX.Element {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.25 }}>
      <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600 }}>
        {children}
      </Typography>
      <Box sx={{ flex: 1 }} />
      {aside}
    </Box>
  );
}
