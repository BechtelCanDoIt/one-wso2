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


import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BankAccount } from "@features/my/api/types";
import { captureDownloads, bytesOf } from "@/test/downloads";
import BankAccountsTable from "./BankAccountsTable";
import {
  ACCOUNT_ID_COLUMN,
  BLANK,
  EMPLOYEE_EMAIL_COLUMN,
  type BankAccountsTableColumn,
} from "../bankAccountsColumns";

function bankAccount(overrides: Partial<BankAccount> = {}): BankAccount {
  return {
    accountId: 1,
    employeeEmail: "jane@wso2.com",
    accountName: "Jane Doe",
    accountNumber: "123456789",
    accountStatus: "ACTIVE",
    accountType: "SALARY",
    bankCode: "7010",
    bankSwiftCode: null,
    bankName: null,
    bankLocation: null,
    branchCode: null,
    branchName: null,
    beneficiaryAddress: null,
    beneficiaryCity: null,
    bankAddress: null,
    paymentMethod: null,
    effectiveFrom: "2026-11",
    createdOn: null,
    netSuiteInternalId: null,
    netSuiteVendorId: null,
    netSuitePaymentFileFormat: null,
    ...overrides,
  };
}

const DEACTIVATE_COLUMN: BankAccountsTableColumn = {
  field: "actions",
  label: "Actions",
  action: true,
  value: () => "",
  render: () => <button type="button">Deactivate</button>,
};

const SWIFT_COLUMN: BankAccountsTableColumn = {
  field: "bankSwiftCode",
  label: "Bank Swift Code",
  value: (a) => a.bankSwiftCode ?? "",
};

function renderTable(props: Partial<Parameters<typeof BankAccountsTable>[0]> = {}) {
  return render(
    <BankAccountsTable
      accounts={[bankAccount({ bankSwiftCode: "HSBCLKLX" })]}
      columns={[ACCOUNT_ID_COLUMN, EMPLOYEE_EMAIL_COLUMN, SWIFT_COLUMN, DEACTIVATE_COLUMN]}
      emptyMessage="No bank account records found."
      {...props}
    />,
  );
}

/** The one file the grid handed the browser, and what it was called. */
async function saved(): Promise<{ csv: string; filename: string }> {
  const user = userEvent.setup();
  const { blobs, filenames } = captureDownloads();
  await user.click(screen.getByRole("button", { name: /export/i }));
  await user.click(await screen.findByRole("menuitem", { name: /csv/i }));
  await waitFor(() => expect(blobs).toHaveLength(1));
  return { csv: new TextDecoder().decode(await bytesOf(blobs[0])), filename: filenames[0] };
}

const savedCsv = async () => (await saved()).csv;

describe("BankAccountsTable toolbar", () => {
  it("offers Columns, Filters, Density and Export above the rows", () => {
    renderTable();

    for (const name of ["Columns", "Filters", "Density", "Export"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("still shows the empty message instead of an empty grid", () => {
    renderTable({ accounts: [] });

    expect(screen.getByText("No bank account records found.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
  });

  it("saves the columns on screen, by their own headings", async () => {
    renderTable();

    const csv = await savedCsv();
    expect(csv).toContain("Employee Email");
    expect(csv).toContain("jane@wso2.com");
    expect(csv).toContain("HSBCLKLX");
  });

  // The action column renders a button, so every row would save as an empty
  // cell under a heading that means nothing outside the app.
  it("leaves the action column out of the saved file", async () => {
    renderTable();

    const csv = await savedCsv();
    expect(csv).not.toContain("Actions");
    expect(csv).not.toContain("Deactivate");
  });
});

describe("BankAccountsTable saved file", () => {
  // Left to itself the grid names every export after the document title,
  // which in a portal of many pages is no name at all.
  it("names the file after what is in it", async () => {
    renderTable();

    expect((await saved()).filename).toBe("bank-accounts.csv");
  });

  // A spreadsheet reads a leading "-" as the start of a formula, so the grid
  // escapes it — a dash exported literally arrives as "\'-" in every blank
  // cell. The dash belongs on screen, not in the file.
  it("writes a missing field as an empty cell, not a dash", async () => {
    renderTable({ accounts: [bankAccount({ bankSwiftCode: null })] });

    const csv = await savedCsv();
    expect(csv).not.toContain("'-");
    expect(csv.trimEnd().endsWith(",")).toBe(true);
  });
});

describe("BankAccountsTable hidden columns", () => {
  it("starts a hiddenByDefault column switched off but still offers it", async () => {
    const user = userEvent.setup();
    renderTable({ hiddenByDefault: ["bankSwiftCode"] });

    const grid = screen.getByRole("grid");
    expect(within(grid).queryByText("Bank Swift Code")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Columns" }));
    const panel = await screen.findByRole("tooltip");
    expect(within(panel).getByText("Bank Swift Code")).toBeInTheDocument();
  });

  it("does not export a column that is switched off", async () => {
    renderTable({ hiddenByDefault: ["bankSwiftCode"] });

    const csv = await savedCsv();
    expect(csv).not.toContain("HSBCLKLX");
    expect(csv).toContain("jane@wso2.com");
  });
});

// Guards the fixture itself: every assertion above reads a value through the
// column's `value`, so a column that forgot one would pass silently.
describe("BankAccountsTable column contract", () => {
  it("renders a null through the column's own blank", () => {
    renderTable({ accounts: [bankAccount({ bankSwiftCode: null })] });

    expect(screen.getAllByRole("gridcell").map((c) => c.textContent)).toContain(BLANK);
  });
});
