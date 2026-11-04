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
import { useNavigate } from "react-router";
import { Box, Button, Link, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@wso2/oxygen-ui";
import { ArrowLeftIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { cado2Paths } from "@features/sales/cado2/cado2Paths";
import { formatMoney } from "@features/sales/cado2/utils/money";
import { useDeskColumn } from "../api/useDeskApi";
import type { DeskCard } from "../api/deskTypes";
import { daysSince, dueText, type ColumnSpec } from "../utils/deskBoard";

const PAGE = 25;

/** What the list says about a quote in its column's own terms. */
function whereItIs(c: DeskCard, column: ColumnSpec["key"]): string {
  if (column === "others") return `Waiting on ${c.waitingOn.join(", ")} · ${c.approvedSteps} of ${c.totalSteps}`;
  if (column === "back") return c.status === "RETURNED" ? `Returned by ${c.returnedBy ?? "an approver"}` : "Recalled";
  if (column === "approved") return "Order form not issued";
  return c.submittedByYou ? "You submitted" : c.resubmitted ? "Resubmitted" : "Deal Desk";
}

function when(c: DeskCard, column: ColumnSpec["key"]): string {
  if (column === "back") return `${daysSince(c.changedAt)} d untouched`;
  if (column === "approved") return `Approved ${daysSince(c.approvedAt)} d ago`;
  return c.dueAt ? dueText(c.dueAt).text : "—";
}

/**
 * One column as a sortable, paged table (D130), for when a column holds
 * hundreds; the board's filters and the column's quick filter still apply.
 */
export default function DeskList({
  spec,
  filterQuery,
  initialSort,
  quick,
  onBack,
}: {
  readonly spec: ColumnSpec;
  readonly filterQuery: string;
  readonly initialSort: string;
  readonly quick: string;
  readonly onBack: () => void;
}): JSX.Element {
  const navigate = useNavigate();
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(0);
  const params = new URLSearchParams(filterQuery);
  params.set("sort", sort);
  if (quick) params.set("quick", quick);
  params.set("limit", String(PAGE));
  params.set("offset", String(page * PAGE));
  const col = useDeskColumn(spec.key, params.toString());
  const items = col.data?.items ?? [];
  const total = col.data?.total ?? 0;
  const quickLabel = spec.quick.find((o) => o.value === quick && quick)?.label;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 1 }}>
        <Link component="button" type="button" variant="body2" onClick={onBack} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
          <ArrowLeftIcon size={14} /> Board
        </Link>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {spec.title}
          {quickLabel ? ` · ${quickLabel}` : ""}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {col.data ? `${total.toLocaleString()} quotes` : ""}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <TextField select size="small" label="Sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }} sx={{ width: 190 }}>
          {spec.sorts.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {col.error ? (
        <ErrorNotice error={col.error} onRetry={() => void col.refetch()} retrying={col.isFetching}>
          Couldn&apos;t load the list.
        </ErrorNotice>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <TableContainer>
            <Table size="small" aria-label={spec.title}>
              <TableHead>
                <TableRow>
                  <TableCell>Quote</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Where it is</TableCell>
                  <TableCell>AM</TableCell>
                  <TableCell>Region</TableCell>
                  <TableCell align="right">TCV</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.quoteId} hover sx={{ cursor: "pointer" }} onClick={() => navigate(cado2Paths.quoteFromDesk(c.quoteId))}>
                    <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                      {c.quoteNumber ?? "Draft"} · v{c.versionNumber}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {c.accountName ?? "—"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.opportunityName ?? ""}
                      </Typography>
                    </TableCell>
                    <TableCell>{whereItIs(c, spec.key)}</TableCell>
                    <TableCell>{c.ownerEmail}</TableCell>
                    <TableCell>{c.region ?? "—"}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                      {c.currency ?? ""} {formatMoney(c.tcv)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{when(c, spec.key)}</TableCell>
                  </TableRow>
                ))}
                {col.data && !items.length ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ color: "text.secondary", py: 3 }}>
                      Nothing here with these filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: "divider" }}>
            <Typography variant="body2" color="text.secondary">
              {total ? `${page * PAGE + 1}–${Math.min((page + 1) * PAGE, total)} of ${total.toLocaleString()}` : ""}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="small" variant="outlined" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
