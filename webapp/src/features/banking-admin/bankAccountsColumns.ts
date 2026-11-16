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

import type { ReactNode } from "react";
import type { BankAccount } from "@features/my/api/types";

// Report and Employee Operations both render the same underlying dataset
// (BankAccount[]) — these are the columns identical between the two, shared
// here instead of once per tab. Each tab appends its own extra column(s)
// (Report: Branch Name, plus the detail set it hides by default; Employee
// Operations: Account Status + Actions) in its own field order, per its own
// default-visible set in the spec. Kept in its own plain (non-JSX) module
// rather than alongside BankAccountsTable's component so that file stays
// component-only for fast refresh.
export interface BankAccountsTableColumn {
  /**
   * Grid column id, and the header a CSV export writes this column under —
   * so it has to be unique within one tab's column set.
   */
  field: string;
  label: string;
  /**
   * The plain value behind the cell. Sorting, filtering and Export all read
   * this rather than the rendered cell, so a column whose `render` returns
   * an element still sorts sensibly and exports something readable instead
   * of a blank.
   */
  value: (account: BankAccount) => string | number;
  /** Cell content, where the column shows more than its own value. */
  render?: (account: BankAccount) => ReactNode;
  /**
   * A control rather than data — never sorted, filtered or exported. A
   * button exports as an empty cell and sorts by nothing, so offering
   * either is just a way to confuse the reader.
   */
  action?: boolean;
}

/**
 * Stands in for a null. Rendered and exported alike, so a saved row reads
 * the same as the one on screen.
 */
export const BLANK = "-";

export const ACCOUNT_ID_COLUMN: BankAccountsTableColumn = {
  field: "accountId",
  label: "Account ID",
  value: (a) => a.accountId,
};
export const EMPLOYEE_EMAIL_COLUMN: BankAccountsTableColumn = {
  field: "employeeEmail",
  label: "Employee Email",
  value: (a) => a.employeeEmail,
};
export const ACCOUNT_NAME_COLUMN: BankAccountsTableColumn = {
  field: "accountName",
  label: "Account Name",
  value: (a) => a.accountName,
};
export const ACCOUNT_NUMBER_COLUMN: BankAccountsTableColumn = {
  field: "accountNumber",
  label: "Account Number",
  value: (a) => a.accountNumber,
};
export const BANK_CODE_COLUMN: BankAccountsTableColumn = {
  field: "bankCode",
  label: "Bank Code",
  value: (a) => a.bankCode ?? BLANK,
};
export const EFFECTIVE_MONTH_COLUMN: BankAccountsTableColumn = {
  field: "effectiveFrom",
  label: "Effective Month",
  value: (a) => a.effectiveFrom,
};
export const ACCOUNT_TYPE_COLUMN: BankAccountsTableColumn = {
  field: "accountType",
  label: "Account Type",
  value: (a) => a.accountType,
};
