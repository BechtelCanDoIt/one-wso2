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
import { Box, Paper, Typography } from "@wso2/oxygen-ui";
import { useInsightsPalette } from "./insightsPalette";

interface KpiCardProps {
  readonly label: string;
  /** The figure, e.g. "$6.4" or "17". */
  readonly value: ReactNode;
  /** A small unit after the figure, e.g. "M" or "h". */
  readonly unit?: string;
  readonly hint?: ReactNode;
  /** The exact figure behind a short value, on hover. */
  readonly title?: string;
  /** A red edge and figure, for the one number that needs attention. */
  readonly alert?: boolean;
}

/** One headline figure (v2): a label, a large figure and a hint. */
export default function KpiCard({ label, value, unit, hint, title, alert = false }: KpiCardProps): JSX.Element {
  const c = useInsightsPalette();
  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label={label}
      sx={{ p: 2.5, borderRadius: 3, minWidth: 0, ...(alert ? { borderLeft: `4px solid ${c.late}` } : {}) }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, fontSize: 13 }}>
        {label}
      </Typography>
      <Box
        title={title}
        sx={{
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          mt: 1.25,
          mb: 0.5,
          fontVariantNumeric: "tabular-nums",
          color: alert ? c.late : "text.primary",
        }}
      >
        {value}
        {unit ? (
          <Box component="span" sx={{ fontSize: 16, fontWeight: 600, color: "text.secondary", ml: 0.4 }}>
            {unit}
          </Box>
        ) : null}
      </Box>
      {hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12.5 }}>
          {hint}
        </Typography>
      ) : null}
    </Paper>
  );
}
