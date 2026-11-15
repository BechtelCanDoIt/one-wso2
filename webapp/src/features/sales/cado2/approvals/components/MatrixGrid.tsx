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
import { alpha, Box, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, type Theme } from "@wso2/oxygen-ui";
import type { ApprovalRoleInfo } from "@features/sales/cado2/approvals/api/approvalTypes";
import { MATRIX_COLUMNS, type GroupPlacement, type MatrixCell, type MatrixRow } from "@features/sales/cado2/approvals/model/matrixGrid";

interface MatrixGridProps {
  readonly rows: readonly MatrixRow[];
  /** Role labels from the matrix; a role not listed shows its code. */
  readonly roles: readonly ApprovalRoleInfo[];
  /** A quote's lines by group code: those rows are highlighted, others dimmed. */
  readonly placements?: ReadonlyMap<string, GroupPlacement>;
}

/**
 * The discount approval matrix as Sales' sheet lays it out (D176): a row per
 * discount group, a column per approver. Unsaved changes (cells with `was`)
 * show in blue over the saved value; a quote's groups are highlighted with
 * their lines, and the highest approver each needs is circled.
 */
export default function MatrixGrid({ rows, roles, placements }: MatrixGridProps): JSX.Element {
  const label = (code: string) => roles.find((r) => r.code === code)?.label ?? code;
  return (
    <TableContainer sx={{ overflowX: "auto" }}>
      <Table size="small" aria-label="Discount approval matrix" sx={{ "& td, & th": { verticalAlign: "top" } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ minWidth: 170 }}>Discount group</TableCell>
            <TableCell sx={{ minWidth: 150 }}>Products</TableCell>
            {MATRIX_COLUMNS.map((r) => (
              <TableCell key={r} align="center" sx={{ minWidth: 76, verticalAlign: "bottom !important", lineHeight: 1.2 }}>
                {label(r)}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const placed = placements?.get(row.code);
            const dim = placements !== undefined && !placed;
            return (
              <TableRow
                key={row.code}
                sx={{
                  opacity: dim ? 0.45 : 1,
                  bgcolor: placed ? (t) => alpha(t.palette.primary.main, 0.06) : undefined,
                  "& > td:first-of-type": placed ? { boxShadow: (t) => `inset 3px 0 0 ${t.palette.primary.main}` } : undefined,
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {row.name}
                    {row.isNew ? <Chip label="New" size="small" color="info" sx={{ ml: 1, height: 18 }} /> : null}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                    {row.code}
                  </Typography>
                  {placed ? (
                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                      {placed.lines.map((l) => (
                        <Chip key={l.lineNumber} size="small" color="primary" variant="outlined" label={`Line ${l.lineNumber} · ${l.productName}`} />
                      ))}
                    </Stack>
                  ) : null}
                </TableCell>
                <TableCell sx={changedSx(row.productsWas !== undefined)}>
                  <Products list={row.products} was={row.productsWas} />
                </TableCell>
                {row.cells.map((c) => (
                  <Cell key={c.role} cell={c} reached={placed?.reachedRole === c.role} />
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** An unsaved change: a light blue cell. */
const changedSx = (changed: boolean) => (changed ? { bgcolor: (t: Theme) => alpha(t.palette.info.main, 0.12) } : {});

function Products({ list, was }: { list: readonly string[]; was?: readonly string[] }): JSX.Element {
  return (
    <Box>
      {list.length === 0 ? (
        <Typography variant="body2" color="warning.main">
          No products
        </Typography>
      ) : (
        list.map((p) => (
          <Typography key={p} variant="body2" sx={{ fontFamily: "monospace", fontSize: 12.5, whiteSpace: "nowrap" }}>
            {p}
          </Typography>
        ))
      )}
      {was ? (
        <Typography variant="caption" color="text.secondary" sx={{ textDecoration: "line-through", display: "block" }}>
          {was.length ? was.join(", ") : "No products"}
        </Typography>
      ) : null}
    </Box>
  );
}

function Cell({ cell, reached }: { cell: MatrixCell; reached: boolean }): JSX.Element {
  const changed = cell.was !== undefined;
  return (
    <TableCell align="center" sx={{ whiteSpace: "nowrap", ...changedSx(changed) }} aria-label={reached ? `${cell.text}, the highest approver this quote needs` : undefined}>
      {changed ? (
        <Typography variant="caption" color="text.secondary" sx={{ textDecoration: "line-through", display: "block" }}>
          {cell.was}
        </Typography>
      ) : null}
      <Typography
        component="span"
        variant="body2"
        sx={{
          color: changed ? "info.main" : cell.kind === "na" ? "text.disabled" : cell.kind === "all" ? "success.main" : "text.primary",
          fontWeight: changed || cell.kind === "above" || cell.kind === "all" || reached ? 600 : 400,
          ...(reached ? { px: 1, py: 0.25, borderRadius: 999, border: 2, borderColor: "primary.main", color: "primary.main" } : {}),
        }}
      >
        {cell.text}
      </Typography>
    </TableCell>
  );
}
