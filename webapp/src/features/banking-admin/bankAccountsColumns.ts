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
import type { AccountStatus, AccountType, BankAccount } from "@features/my/api/types";

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
   * Grid column id — unique within one tab's column set, and the name a
   * caller's `hiddenByDefault` entry has to match.
   *
   * Not the heading an export writes: that is `label`, which the grid
   * prefers over the id for both the screen and the file.
   */
  field: string;
  /** The heading, on screen and at the top of this column in an export. */
  label: string;
  /**
   * The plain value behind the cell. Sorting, filtering and Export all read
   * this rather than the rendered cell, so a column whose `render` returns
   * an element still sorts sensibly and exports something readable instead
   * of a blank.
   */
  value: (account: BankAccount) => string | number;
  /**
   * Cell content, where the column shows more than its own value.
   *
   * Takes the cell's own `tabIndex` as well: the grid moves focus between
   * cells itself and hands exactly one of them a 0, so a control that
   * ignores this adds a Tab stop per row and breaks that.
   */
  render?: (account: BankAccount, cell: { tabIndex: -1 | 0 }) => ReactNode;
  /**
   * The closed set this column's values come from.
   *
   * Without one the grid filters a text column by substring, which is the
   * wrong question to ask of a status: `contains "ACTIVE"` keeps the
   * INACTIVE rows too, and an Export straight afterwards writes
   * deactivated accounts into a file the admin had filtered down to the
   * active ones. Declaring the set gets equality instead.
   */
  options?: readonly string[];
  /**
   * A control rather than data — never sorted, filtered or exported, and
   * not something the Columns panel offers to hide. A button exports as an
   * empty cell and sorts by nothing, so offering either is just a way to
   * confuse the reader; and hiding the column takes away the row's only
   * action with nothing left on screen to say where it went.
   */
  action?: boolean;
}

/**
 * Painted in place of a null.
 *
 * Display only — `value` returns "" for a missing field, never this. A CSV
 * export escapes anything that a spreadsheet might read as a formula, and a
 * bare "-" qualifies, so exporting it writes `"\'-"` into every blank cell.
 * An empty cell is what a blank should look like in a file anyway.
 */
export const BLANK = "-";

// The two closed sets these tables carry. Shared with the Report's own
// filter controls, which pick from the same values — one list each, so a
// column's filter and the search above it can't offer different members.
export const ACCOUNT_TYPES: AccountType[] = ["SALARY", "CONSULTANCY", "REIMBURSEMENT"];
export const ACCOUNT_STATUSES: AccountStatus[] = ["ACTIVE", "INACTIVE", "REJECTED", "REQUESTED"];

/**
 * A column showing one BankAccount field as it stands, blank when it is null.
 *
 * `field` doubles as the grid column id, so taking it from `keyof
 * BankAccount` keeps the id and the value it reads from drifting apart: a
 * renamed field stops compiling here instead of quietly exporting an empty
 * column, and a typo in a caller's `hiddenByDefault` no longer silently
 * matches nothing.
 */
export function fieldColumn(
  field: keyof BankAccount,
  label: string,
  options?: readonly string[],
): BankAccountsTableColumn {
  return { field, label, value: (account) => account[field] ?? "", options };
}

export const ACCOUNT_ID_COLUMN = fieldColumn("accountId", "Account ID");
export const EMPLOYEE_EMAIL_COLUMN = fieldColumn("employeeEmail", "Employee Email");
export const ACCOUNT_NAME_COLUMN = fieldColumn("accountName", "Account Name");
export const ACCOUNT_NUMBER_COLUMN = fieldColumn("accountNumber", "Account Number");
export const BANK_CODE_COLUMN = fieldColumn("bankCode", "Bank Code");
export const EFFECTIVE_MONTH_COLUMN = fieldColumn("effectiveFrom", "Effective Month");
export const ACCOUNT_TYPE_COLUMN = fieldColumn("accountType", "Account Type", ACCOUNT_TYPES);
