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

import { useState } from "react";
import { Autocomplete, Box, Button, TextField } from "@wso2/oxygen-ui";
import { useReportAccounts } from "@features/my/api/useReportAccounts";
import type { BankAccount, ReportFilters } from "@features/my/api/types";
import BankAccountsTable from "../components/BankAccountsTable";
import {
  ACCOUNT_ID_COLUMN,
  ACCOUNT_NAME_COLUMN,
  ACCOUNT_NUMBER_COLUMN,
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_COLUMN,
  BANK_CODE_COLUMN,
  EFFECTIVE_MONTH_COLUMN,
  EMPLOYEE_EMAIL_COLUMN,
  fieldColumn,
  type BankAccountsTableColumn,
} from "../bankAccountsColumns";

const BLANK_FILTERS: ReportFilters = { createdFrom: "", createdTo: "", accountTypesArray: [], statusArray: [] };

// The columns this tab shows by default, in its own order, with the
// account detail the report is reconciled against carried alongside them
// but switched off — see HIDDEN_BY_DEFAULT. Everything here is exportable,
// so turning a column on and saving the result is how a reconciliation gets
// the field it needs.
const COLUMNS: BankAccountsTableColumn[] = [
  ACCOUNT_ID_COLUMN,
  fieldColumn("netSuiteInternalId", "NetSuite Internal Id"),
  fieldColumn("netSuiteVendorId", "NetSuite Vendor Id"),
  fieldColumn("netSuitePaymentFileFormat", "NetSuite Payment File Format"),
  // Only consultancy accounts carry a payment method, so every other
  // Account Type renders "-".
  fieldColumn("paymentMethod", "Payment Method"),
  EMPLOYEE_EMAIL_COLUMN,
  ACCOUNT_NAME_COLUMN,
  ACCOUNT_NUMBER_COLUMN,
  fieldColumn("beneficiaryAddress", "Account Holder Address"),
  // Only consultancy accounts carry a beneficiary city, so every other
  // Account Type renders "-".
  fieldColumn("beneficiaryCity", "Account Holder City"),
  BANK_CODE_COLUMN,
  fieldColumn("bankSwiftCode", "Bank Swift Code"),
  fieldColumn("bankName", "Bank Name"),
  fieldColumn("bankLocation", "Bank Location"),
  fieldColumn("branchName", "Branch Name"),
  EFFECTIVE_MONTH_COLUMN,
  ACCOUNT_TYPE_COLUMN,
  // A Search can select several statuses at once, or none, and the rows
  // that come back are then indistinguishable in the file — a deactivated
  // account reads exactly like a live one. Closed set, so its filter
  // matches exactly: "contains ACTIVE" would keep the INACTIVE rows too.
  fieldColumn("accountStatus", "Account Status", ACCOUNT_STATUSES),
];

// Carried but switched off, so the default view stays the set this tab has
// always shown. The NetSuite identifiers and the bank's own details are
// only wanted when something is being chased down, and showing all
// eighteen columns at once leaves every one of them too narrow to read.
//
// Typed against BankAccount rather than left as plain strings: an entry
// that matches no column hides nothing at all, and silently showing a
// column that was meant to start off is not a failure anyone would notice.
const HIDDEN_BY_DEFAULT: (keyof BankAccount)[] = [
  "netSuiteInternalId",
  "netSuiteVendorId",
  "netSuitePaymentFileFormat",
  "paymentMethod",
  "beneficiaryAddress",
  "bankSwiftCode",
  "bankName",
  "bankLocation",
  "accountStatus",
];

// The Report tab — a filterable, all-employee bank-account table. Nothing
// is fetched until Search is pressed (appliedFilters starts undefined).
export default function ReportTab() {
  const [draft, setDraft] = useState<ReportFilters>(BLANK_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters | undefined>(undefined);
  const accountsQuery = useReportAccounts(appliedFilters);

  // Clears the filter controls back to blank but never dispatches a fetch
  // or a reset action, so a result set already on screen from a previous
  // Search stays until Search is pressed again.
  function handleReset() {
    setDraft(BLANK_FILTERS);
  }

  const rows = accountsQuery.data?.bankAccounts ?? [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          label="Start Date"
          type="date"
          size="small"
          value={draft.createdFrom}
          onChange={(e) => setDraft((f) => ({ ...f, createdFrom: e.target.value }))}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="End Date"
          type="date"
          size="small"
          value={draft.createdTo}
          onChange={(e) => setDraft((f) => ({ ...f, createdTo: e.target.value }))}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Autocomplete
          multiple
          size="small"
          options={ACCOUNT_TYPES}
          value={draft.accountTypesArray}
          onChange={(_, next) => setDraft((f) => ({ ...f, accountTypesArray: next }))}
          sx={{ width: 260 }}
          renderInput={(params) => <TextField {...params} label="Account Type" />}
        />
        <Autocomplete
          multiple
          size="small"
          options={ACCOUNT_STATUSES}
          value={draft.statusArray}
          onChange={(_, next) => setDraft((f) => ({ ...f, statusArray: next }))}
          sx={{ width: 260 }}
          renderInput={(params) => <TextField {...params} label="Account State" />}
        />
        <Button variant="contained" onClick={() => setAppliedFilters(draft)}>
          Search
        </Button>
        <Button variant="outlined" onClick={handleReset}>
          Reset Filters
        </Button>
      </Box>

      <BankAccountsTable
        loading={accountsQuery.isFetching}
        accounts={rows}
        columns={COLUMNS}
        hiddenByDefault={HIDDEN_BY_DEFAULT}
        emptyMessage="No bank account records found."
      />
    </Box>
  );
}
