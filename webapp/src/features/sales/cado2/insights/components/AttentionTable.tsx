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

import { useState, type JSX } from "react";
import { Link as RouterLink } from "react-router";
import { Box, Button, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@wso2/oxygen-ui";
import { cado2Paths } from "@features/sales/cado2/cado2Paths";
import { slaLabel } from "@features/sales/cado2/approvals/sla";
import { formatMoney } from "@features/sales/cado2/utils/money";
import type { AttentionItem } from "../api/insightsTypes";
import { waitingSince } from "../utils/format";
import { useInsightsPalette } from "./insightsPalette";

/** How many rows show before "Show all". */
export const ATTENTION_TOP = 10;

/** The overdue and due-soon steps (v2): the top 10, then all on request. */
export default function AttentionTable({ items, currency }: { readonly items: readonly AttentionItem[]; readonly currency: string }): JSX.Element {
  const c = useInsightsPalette();
  const [all, setAll] = useState(false);
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        Nothing is overdue or due soon.
      </Typography>
    );
  }
  const shown = all ? items : items.slice(0, ATTENTION_TOP);
  const now = new Date();
  const head = { fontSize: 12, color: "text.secondary", fontWeight: 600, borderColor: c.line };
  const cell = { borderColor: c.line, fontSize: 13.5 };
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small" aria-label="Approvals that need attention">
        <TableHead>
          <TableRow>
            <TableCell sx={head}>Quote</TableCell>
            <TableCell sx={head}>Account</TableCell>
            <TableCell sx={head}>Region</TableCell>
            <TableCell sx={head} align="right">
              Value ({currency})
            </TableCell>
            <TableCell sx={head}>Waiting on</TableCell>
            <TableCell sx={head}>Waiting for</TableCell>
            <TableCell sx={head}>Deadline</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {shown.map((a) => {
            const late = a.slaState === "BREACHED";
            const deadline = a.dueAt ? slaLabel(a.slaState, a.dueAt, now) : null;
            return (
              <TableRow key={a.stepId} hover>
                <TableCell sx={{ ...cell, whiteSpace: "nowrap" }}>
                  <Link component={RouterLink} to={cado2Paths.quote(a.quoteId, "approvals")} sx={{ fontWeight: 700, color: "text.primary" }}>
                    {a.quoteNumber ?? `Quote ${a.quoteId}`}
                  </Link>
                </TableCell>
                <TableCell sx={cell}>{a.accountName ?? "—"}</TableCell>
                <TableCell sx={cell}>{a.region ?? "—"}</TableCell>
                <TableCell sx={{ ...cell, fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }} align="right">
                  <span title={`${a.currency ?? ""} ${formatMoney(a.tcv)}`}>{formatMoney(a.value)}</span>
                </TableCell>
                <TableCell sx={cell}>{a.waitingOn}</TableCell>
                <TableCell sx={{ ...cell, whiteSpace: "nowrap" }}>{waitingSince(a.requestedAt, now)}</TableCell>
                <TableCell sx={cell}>
                  {deadline ? (
                    <Box
                      component="span"
                      title={deadline.title}
                      sx={{
                        px: 1,
                        py: 0.4,
                        borderRadius: 1.5,
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        bgcolor: late ? c.lateTint : c.soonTint,
                        color: late ? c.lateText : c.soonText,
                      }}
                    >
                      {deadline.label}
                    </Box>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {items.length > ATTENTION_TOP ? (
        <Button size="small" onClick={() => setAll((v) => !v)} sx={{ mt: 1, textTransform: "none", fontWeight: 600 }}>
          {all ? "Show the top 10" : `Show all ${items.length}`}
        </Button>
      ) : null}
    </Box>
  );
}
