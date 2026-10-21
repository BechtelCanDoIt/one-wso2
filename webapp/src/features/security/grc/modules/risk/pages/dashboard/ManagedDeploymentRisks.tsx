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

import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@wso2/oxygen-ui";
import type { JSX } from "react";
import type { ManagedServicesRisks } from "../../api/riskApi";
import { LEVEL_FALLBACK_COLORS, LEVEL_LABELS, LEVEL_ORDER, OPEN_COLOR, labelColorOn } from "./constants";
import { highSeverityCallout, maxThemeTotal, themeSegments } from "./managedDeployments";

const LABEL_WIDTH = { xs: 120, md: 200 };

interface ManagedDeploymentRisksProps {
  data: ManagedServicesRisks;
}

// "Most Common Risks — Managed Deployments": per Risk Category, a stacked bar
// of open risks by level beside a table of how many customers it affects. Rows
// follow the service's order (most open risks first) in both panels.
export default function ManagedDeploymentRisks({ data }: ManagedDeploymentRisksProps): JSX.Element {
  const scale = maxThemeTotal(data.themes);
  const callout = highSeverityCallout(data);

  if (data.themes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No open risks in Managed Services registers.
      </Typography>
    );
  }

  return (
    <>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "7fr 5fr" }, gap: 3 }}>
        <Box>
          <Stack spacing={1} role="list" aria-label="Open risks by theme and level">
            {data.themes.map((theme) => (
              <Stack key={theme.category_id} direction="row" alignItems="center" gap={1.5} role="listitem">
                <Typography variant="body2" sx={{ width: LABEL_WIDTH, flexShrink: 0, textAlign: "right" }}>
                  {theme.category_name}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", height: 28, width: `${(theme.total / scale) * 100}%` }}>
                    {themeSegments(theme).map((segment) => (
                      <Box
                        key={segment.level}
                        title={`${segment.label}: ${segment.count}`}
                        sx={{
                          flex: segment.count,
                          minWidth: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: segment.color,
                          color: labelColorOn(segment.color),
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {segment.count}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Stack>
            ))}
          </Stack>
          <Stack direction="row" justifyContent="center" gap={2} sx={{ mt: 2 }}>
            {LEVEL_ORDER.map((level) => (
              <Stack key={level} direction="row" alignItems="center" gap={0.5}>
                <Box sx={{ width: 10, height: 10, bgcolor: LEVEL_FALLBACK_COLORS[level] }} />
                <Typography variant="body2" color="text.secondary">
                  {LEVEL_LABELS[level]}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Theme</TableCell>
                  <TableCell align="right">Customers</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.themes.map((theme) => (
                  <TableRow key={theme.category_id}>
                    <TableCell>{theme.category_name}</TableCell>
                    <TableCell align="right">
                      {theme.customers}/{data.customer_count}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {theme.total}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {callout && (
            <Box
              sx={{
                mt: 2,
                px: 1.5,
                py: 1,
                textAlign: "center",
                border: `1px solid ${OPEN_COLOR}`,
                borderRadius: 1,
                bgcolor: `${OPEN_COLOR}1a`,
              }}
            >
              <Typography variant="body2" fontWeight={700} sx={{ color: OPEN_COLOR }}>
                ⚠ {callout}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}
