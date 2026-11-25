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
import {
  Box,
  Button,
  Checkbox,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
} from "@wso2/oxygen-ui";
import { TABLE_HEAD_SX } from "./eaStyles";
import { RowMenu } from "./RowActions";

export interface Column<T> {
  readonly key: string;
  readonly label: string;
  readonly align?: "left" | "right";
  readonly width?: string | number;
  readonly render: (row: T) => ReactNode;
}

/** A row action: the primary one is a filled button, the rest sit in the row's menu. */
export interface RowAction {
  readonly label: string;
  readonly icon?: ReactNode;
  readonly onClick: () => void;
  readonly danger?: boolean;
  readonly disabled?: boolean;
}

export interface RowSelection<T> {
  readonly selected: ReadonlySet<string>;
  readonly onToggle: (id: string) => void;
  readonly onToggleAll?: (ids: readonly string[]) => void;
  /** `true`, or why the row cannot be ticked (shown on hover). */
  readonly canSelect: (row: T) => true | string;
}


const BARE_SX = {
  "& th, & tbody tr td:first-of-type": { whiteSpace: "nowrap" },
  "& .MuiTableCell-alignRight": { whiteSpace: "nowrap" },
} as const;

/** The one table every Engagement App list uses. */
export default function EaTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  canOpen,
  primaryAction,
  menu,
  selection,
  empty,
  loading = false,
  pagination,
  ariaLabel,
  bare = false,
}: {
  readonly columns: readonly Column<T>[];
  readonly rows: readonly T[];
  readonly rowKey: (row: T) => string;
  readonly onRowClick?: (row: T) => void;
  /** Rows for which this is false are plain: no pointer, tab stop or click handler. */
  readonly canOpen?: (row: T) => boolean;
  readonly primaryAction?: (row: T) => RowAction | undefined;
  readonly menu?: (row: T) => readonly RowAction[];
  readonly selection?: RowSelection<T>;
  readonly empty: ReactNode;
  readonly loading?: boolean;
  /** `pageSizes` with `onPageSize` lets the reader pick how many rows a page shows. */
  readonly pagination?: { page: number; pageSize: number; total: number; onPage: (page: number) => void; pageSizes?: readonly number[]; onPageSize?: (size: number) => void };
  readonly ariaLabel: string;
  /** Inside a card (a dashboard widget): no box of its own, labels and figures kept on one line. */
  readonly bare?: boolean;
}): JSX.Element {
  const hasActions = Boolean(primaryAction || menu);
  const colCount = columns.length + (selection ? 1 : 0) + (hasActions ? 1 : 0);
  // Rows shown as a skeleton (or as placeholders of a new search) cannot be selected.
  const selectable = selection && !loading ? rows.filter((r) => selection.canSelect(r) === true).map(rowKey) : [];
  const allTicked = selectable.length > 0 && selectable.every((id) => selection?.selected.has(id));

  return (
    <Box sx={bare ? undefined : { border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" aria-label={ariaLabel} sx={bare ? BARE_SX : undefined}>
          <TableHead>
            <TableRow sx={TABLE_HEAD_SX}>
              {selection ? (
                <TableCell padding="checkbox">
                  {selection.onToggleAll && selectable.length ? (
                    <Checkbox
                      size="small"
                      checked={allTicked}
                      indeterminate={!allTicked && selectable.some((id) => selection.selected.has(id))}
                      onChange={() => selection.onToggleAll?.(selectable)}
                      inputProps={{ "aria-label": "Select all rows" }}
                    />
                  ) : null}
                </TableCell>
              ) : null}
              {columns.map((c) => (
                <TableCell key={c.key} align={c.align} sx={{ width: c.width }}>
                  {c.label}
                </TableCell>
              ))}
              {hasActions ? <TableCell sx={{ width: 150 }} aria-label="Actions" /> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: Math.min(Math.max(rows.length, 3), 10) }, (_, i) => (
                  <TableRow key={`s${i}`} aria-hidden>
                    {selection ? (
                      <TableCell padding="checkbox">
                        <Skeleton variant="rounded" width={18} height={18} sx={{ mx: "auto" }} />
                      </TableCell>
                    ) : null}
                    {columns.map((c) => (
                      <TableCell key={c.key} align={c.align} sx={{ py: 1.25 }}>
                        <Skeleton variant="text" width={`${60 + ((i + c.key.length) % 3) * 15}%`} sx={{ fontSize: 13, ml: c.align === "right" ? "auto" : 0 }} />
                        <Skeleton variant="text" width="40%" sx={{ fontSize: 11.5, ml: c.align === "right" ? "auto" : 0 }} />
                      </TableCell>
                    ))}
                    {hasActions ? (
                      <TableCell align="right">
                        <Skeleton variant="rounded" width={72} height={28} sx={{ ml: "auto" }} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              : null}
            {!loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} sx={{ border: 0 }}>
                  {empty}
                </TableCell>
              </TableRow>
            ) : null}
            {(loading ? [] : rows).map((row) => {
              const id = rowKey(row);
              const action = primaryAction?.(row);
              const items = menu?.(row) ?? [];
              const can = selection?.canSelect(row);
              const open = onRowClick && (canOpen?.(row) ?? true) ? onRowClick : undefined;
              return (
                <TableRow
                  key={id}
                  hover={Boolean(open)}
                  onClick={open ? () => open(row) : undefined}
                  tabIndex={open ? 0 : undefined}
                  onKeyDown={
                    open
                      ? (ev) => {
                          if (ev.target === ev.currentTarget && (ev.key === "Enter" || ev.key === " ")) {
                            ev.preventDefault();
                            open(row);
                          }
                        }
                      : undefined
                  }
                  sx={{
                    cursor: open ? "pointer" : undefined,
                    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
                    verticalAlign: "top",
                    "& td": { fontSize: 13, py: 1.25 },
                  }}
                >
                  {selection ? (
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title={can === true ? "" : (can ?? "")} placement="right">
                        <span>
                          <Checkbox
                            size="small"
                            checked={selection.selected.has(id)}
                            disabled={can !== true}
                            onChange={() => selection.onToggle(id)}
                            inputProps={{ "aria-label": `Select ${id}` }}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                  ) : null}
                  {columns.map((c) => (
                    <TableCell key={c.key} align={c.align}>
                      {c.render(row)}
                    </TableCell>
                  ))}
                  {hasActions ? (
                    <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: "nowrap" }}>
                      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                        {action ? (
                          <Button
                            size="small"
                            variant="contained"
                            disabled={action.disabled}
                            startIcon={action.icon}
                            onClick={action.onClick}
                            sx={{ fontWeight: 600 }}
                          >
                            {action.label}
                          </Button>
                        ) : null}
                        {/* The menu keeps its slot so primary buttons line up across rows. */}
                        <Box sx={{ width: 34, display: "inline-flex", justifyContent: "center" }}>
                          {items.length ? <RowMenu items={items} label={id} /> : null}
                        </Box>
                      </Box>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
      {pagination && pagination.total > Math.min(pagination.pageSize, ...(pagination.onPageSize ? (pagination.pageSizes ?? []) : [])) ? (
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page}
          rowsPerPage={pagination.pageSize}
          rowsPerPageOptions={pagination.onPageSize && pagination.pageSizes ? [...pagination.pageSizes] : [pagination.pageSize]}
          onRowsPerPageChange={pagination.onPageSize ? (e) => pagination.onPageSize?.(Number(e.target.value)) : undefined}
          onPageChange={(_, p) => pagination.onPage(p)}
          sx={{ borderTop: 1, borderColor: "divider" }}
        />
      ) : null}
    </Box>
  );
}
