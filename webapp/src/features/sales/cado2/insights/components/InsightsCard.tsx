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
import { Paper, Stack, Typography } from "@wso2/oxygen-ui";

/** A titled panel of the Insights page: title, a one-line hint, content. */
export default function InsightsCard({
  title,
  hint,
  aside,
  children,
}: {
  readonly title: string;
  readonly hint?: ReactNode;
  readonly aside?: ReactNode;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <Paper component="section" aria-label={title} variant="outlined" sx={{ p: 2.5, borderRadius: 3, minWidth: 0 }}>
      <Stack direction="row" sx={{ alignItems: "flex-start", mb: 2.25 }}>
        <Stack sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, fontSize: 15 }}>
            {title}
          </Typography>
          {hint ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12.5, mt: 0.25 }}>
              {hint}
            </Typography>
          ) : null}
        </Stack>
        {aside}
      </Stack>
      {children}
    </Paper>
  );
}
