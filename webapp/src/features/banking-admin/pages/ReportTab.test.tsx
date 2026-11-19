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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { captureDownloads, bytesOf } from "@/test/downloads";
import type { BankAccount } from "@features/my/api/types";

const accounts = vi.hoisted(() => ({ data: [] as BankAccount[] }));
const reportAccountsSpy = vi.hoisted(() => vi.fn());

vi.mock("@features/my/api/useReportAccounts", () => ({
  useReportAccounts: (filters: unknown) => {
    reportAccountsSpy(filters);
    return { data: { bankAccounts: accounts.data, count: accounts.data.length }, isLoading: false, isError: false };
  },
}));

const { default: ReportTab } = await import("./ReportTab");

function bankAccount(overrides: Partial<BankAccount> = {}): BankAccount {
  return {
    accountId: 1,
    employeeEmail: "jane@wso2.com",
    accountName: "Jane Doe",
    accountNumber: "123456789",
    accountStatus: "ACTIVE",
    accountType: "SALARY",
    bankCode: "COM001",
    bankSwiftCode: "COMBLK",
    bankName: "Commercial Bank",
    bankLocation: "Sri Lanka",
    branchCode: "001",
    branchName: "Colombo",
    beneficiaryAddress: "123 Main St",
    beneficiaryCity: null,
    bankAddress: "456 Bank Rd",
    paymentMethod: null,
    effectiveFrom: "2026-10-01",
    createdOn: "2026-09-01",
    netSuiteInternalId: null,
    netSuiteVendorId: null,
    netSuitePaymentFileFormat: null,
    ...overrides,
  };
}

beforeEach(() => {
  accounts.data = [];
  reportAccountsSpy.mockReset();
});

// The export test below stands in for `URL.createObjectURL` and for the
// click of every anchor in the document, and neither the runner nor the
// global setup puts them back on its own — so every later test's clicks
// would be captured instead of performed.
afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReportTab", () => {
  it("renders the default-visible columns and rows", () => {
    accounts.data = [bankAccount({ employeeEmail: "jane@wso2.com", branchName: "Colombo" })];
    render(<ReportTab />);
    expect(screen.getByText("Account ID")).toBeInTheDocument();
    expect(screen.getByText("Employee Email")).toBeInTheDocument();
    expect(screen.getByText("Branch Name")).toBeInTheDocument();
    expect(screen.getByText("Effective Month")).toBeInTheDocument();
    expect(screen.getByText("jane@wso2.com")).toBeInTheDocument();
    expect(screen.getByText("Colombo")).toBeInTheDocument();
  });

  it("renders the beneficiary city for a consultancy account and a dash when it is unset", () => {
    accounts.data = [
      bankAccount({ accountId: 1, accountType: "SALARY", beneficiaryCity: null }),
      bankAccount({
        accountId: 2,
        accountType: "CONSULTANCY",
        employeeEmail: "raj@wso2.com",
        beneficiaryCity: "Kandy",
      }),
    ];
    render(<ReportTab />);

    // Located by header rather than a fixed offset, so reordering the columns
    // can't quietly point these assertions at a different cell.
    const [headerRow, salaryRow, consultancyRow] = screen.getAllByRole("row");
    const cityIndex = within(headerRow)
      .getAllByRole("columnheader")
      .findIndex((header) => header.textContent === "Account Holder City");
    expect(cityIndex).toBeGreaterThan(-1);

    expect(within(salaryRow).getAllByRole("gridcell")[cityIndex]).toHaveTextContent(/^-$/);
    expect(within(consultancyRow).getAllByRole("gridcell")[cityIndex]).toHaveTextContent(/^Kandy$/);
  });

  it("offers the grid toolbar, so a result set can be saved", () => {
    accounts.data = [bankAccount()];
    render(<ReportTab />);

    for (const name of ["Columns", "Filters", "Density", "Export"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  // The NetSuite identifiers and the bank's own details are carried for the
  // reconciliations this report feeds, but seventeen columns at once leaves
  // every one of them too narrow to read.
  it("keeps the detail columns off until they are switched on", async () => {
    const user = userEvent.setup();
    accounts.data = [bankAccount({ bankName: "HSBC", netSuiteVendorId: "4821" })];
    render(<ReportTab />);

    const grid = screen.getByRole("grid");
    expect(within(grid).queryByText("Bank Name")).not.toBeInTheDocument();
    expect(within(grid).queryByText("NetSuite Vendor Id")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Columns" }));
    const panel = await screen.findByRole("tooltip");
    expect(within(panel).getByText("Bank Name")).toBeInTheDocument();
    expect(within(panel).getByText("NetSuite Vendor Id")).toBeInTheDocument();
  });

  // This tab carries eight nullable columns. A spreadsheet reads a leading
  // "-" as a formula, so the grid escapes it — any one of them exporting a
  // dash rather than nothing would reach the file as "\'-".
  it("saves its empty fields as empty cells", async () => {
    const user = userEvent.setup();
    const { blobs, filenames } = captureDownloads();
    accounts.data = [bankAccount({ beneficiaryCity: null, branchName: null, bankCode: null })];
    render(<ReportTab />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(await screen.findByRole("menuitem", { name: /csv/i }));
    await waitFor(() => expect(blobs).toHaveLength(1));

    expect(filenames[0]).toBe("bank-accounts.csv");
    expect(new TextDecoder().decode(await bytesOf(blobs[0]))).not.toContain("'-");
  });

  it("shows a clear empty state when a filter combination matches nothing", () => {
    render(<ReportTab />);
    expect(screen.getByText("No bank account records found.")).toBeInTheDocument();
  });

  it("builds the expected query when Search is pressed", async () => {
    const user = userEvent.setup();
    render(<ReportTab />);

    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-01-31" } });

    await user.click(screen.getByLabelText("Account Type"));
    await user.click(await screen.findByText("SALARY"));
    await user.click(screen.getByLabelText("Account State"));
    await user.click(await screen.findByText("ACTIVE"));

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(reportAccountsSpy).toHaveBeenLastCalledWith({
      createdFrom: "2026-01-01",
      createdTo: "2026-01-31",
      accountTypesArray: ["SALARY"],
      statusArray: ["ACTIVE"],
    });
  });
});
