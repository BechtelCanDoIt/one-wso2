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
import { Box, Chip, Stack, Typography } from "@wso2/oxygen-ui";

/**
 * What a reviewer writes, in its place in the quote under their lens (D129):
 * outlined and labelled, with room for long text. "Yours to write" by
 * default; "To review" for text someone else wrote that the reviewer may
 * change (Legal and Deal Desk's special terms).
 */
export default function YoursToWrite({
  title,
  intro,
  label = "Yours to write",
  children,
}: {
  readonly title: string;
  readonly label?: string;
  readonly intro?: ReactNode;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <Box
      component="section"
      aria-label={`${title}: ${label.toLowerCase()}`}
      sx={(theme) => ({
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: 1.5,
        borderColor: "info.main",
        boxShadow: `0 0 0 4px ${theme.palette.info.main}1f`,
        bgcolor: "background.paper",
      })}
    >
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: intro ? 0.75 : 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "info.main" }}>
          {title}
        </Typography>
        <Chip size="small" color="info" variant="outlined" label={label} sx={{ fontWeight: 700 }} />
      </Stack>
      {intro ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {intro}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
}
