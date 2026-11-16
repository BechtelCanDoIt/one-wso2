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


import { useMemo } from "react";
import { Chip, DataGrid, Typography } from "@wso2/oxygen-ui";
import type { AccountStatus, BankAccount } from "@features/my/api/types";
import type { BankAccountsTableColumn } from "../bankAccountsColumns";
import { BankingGridToolbar } from "./BankingGridToolbar";

// Report and Employee Operations both render the same underlying dataset
// (BankAccount[]) — this is the one shared piece, per the spec's own
// rationale for bundling these two tabs into one ticket. Each caller
// supplies its own column set (they overlap but aren't identical: Report
// adds Branch Name and a detail set it hides by default, Employee
// Operations adds a Status chip and a per-row action) — see
// bankAccountsColumns.ts for the shared ones.
//
// A DataGrid rather than a plain table, for the toolbar above it: these
// rows are reconciled against payroll and NetSuite outside the app, and
// Export is the only way to get them out without copying the page by hand.
// Columns and Filters come with it, which is what makes the wider detail
// set worth carrying at all — see ReportTab's own list.

// Same page-size choices across every tab that lists bank accounts (Report
// and Employee Operations), so the control feels consistent between them.
const ROWS_PER_PAGE_OPTIONS = [6, 10, 25, 50];

type ChipColor = "default" | "success" | "warning" | "error";

// Same colour assignments SummaryTab already uses for this same field —
// duplicated here rather than shared, since it's a 4-entry map and the two
// tabs live in different feature folders (my/banking vs. banking-admin);
// not worth a cross-feature import for four lines.
const ACCOUNT_STATUS_COLOR: Record<AccountStatus, ChipColor> = {
  ACTIVE: "success",
  REQUESTED: "warning",
  REJECTED: "error",
  INACTIVE: "default",
};

export function AccountStatusChip({ status }: { status: AccountStatus }) {
  return <Chip label={status} color={ACCOUNT_STATUS_COLOR[status]} variant="outlined" size="small" />;
}

export default function BankAccountsTable({
  accounts,
  columns,
  emptyMessage,
  hiddenByDefault = [],
}: {
  accounts: BankAccount[];
  columns: BankAccountsTableColumn[];
  emptyMessage: string;
  /**
   * Fields the Columns panel starts with switched off. The column is still
   * there to be turned on, and an export carries whatever is on at the time.
   */
  hiddenByDefault?: string[];
}) {
  const gridColumns = useMemo<DataGrid.GridColDef<BankAccount>[]>(
    () =>
      columns.map((column) => {
        const { render } = column;
        return {
          field: column.field,
          headerName: column.label,
          flex: 1,
          minWidth: 140,
          // Sorting or filtering a column of buttons orders rows by nothing
          // and exports them as blanks, so the action column opts out of all
          // three rather than offering controls that do nothing.
          sortable: !column.action,
          filterable: !column.action,
          disableExport: column.action,
          // Export, sorting and filtering read this, not the rendered cell —
          // so a column that renders a chip still saves as readable text.
          valueGetter: (_value: unknown, row: BankAccount) => column.value(row),
          ...(render
            ? { renderCell: (params: DataGrid.GridRenderCellParams<BankAccount>) => render(params.row) }
            : {}),
        };
      }),
    [columns],
  );

  const columnVisibilityModel = useMemo(
    () => Object.fromEntries(hiddenByDefault.map((field) => [field, false])),
    [hiddenByDefault],
  );

  if (accounts.length === 0) {
    return <Typography color="text.secondary">{emptyMessage}</Typography>;
  }

  return (
    <DataGrid.DataGrid
      rows={accounts}
      columns={gridColumns}
      getRowId={(row) => row.accountId}
      autoHeight
      showToolbar
      slots={{ toolbar: BankingGridToolbar }}
      disableRowSelectionOnClick
      initialState={{
        columns: { columnVisibilityModel },
        pagination: { paginationModel: { pageSize: ROWS_PER_PAGE_OPTIONS[0] } },
      }}
      pageSizeOptions={ROWS_PER_PAGE_OPTIONS}
      sx={{ border: "none" }}
    />
  );
}
