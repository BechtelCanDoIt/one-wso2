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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExcelJS from "exceljs";
import { bytesOf, captureDownloads } from "@/test/downloads";
import MisCustomerDrillDown from "./MisCustomerDrillDown";
import type { DrillDownCustomer } from "./drillDownColumns";
import type { DrillDownState } from "../api/useDrillDownCustomers";

// Vitest's 5s default is the wrong one for this file: sorting and filtering
// each mount a real `BuildTable` and click through every column, which runs
// past five seconds under the full suite's parallelism. Same line as
// `MisOpportunities.test.tsx`.
vi.setConfig({ testTimeout: 20_000 });

// The dialog behind a figure: who is inside this number.
//
// The fetch is stubbed at the hook's own shape — it has its own tests — so this
// file is about what a reader sees.

const NORTHWIND: DrillDownCustomer = {
  accountId: "0018000001abcXYZ",
  name: "Northwind Bank",
  salesRegion: "EMEA",
  subRegion: "Northern Europe",
  amount: 750000,
  accountOwner: "John Doe",
};

const loaded = (customers: DrillDownCustomer[]): DrillDownState => ({
  customers,
  isLoading: false,
  isError: false,
  errorMessage: "",
  retry: () => {},
});

function renderDialog(over: Partial<Parameters<typeof MisCustomerDrillDown>[0]> = {}) {
  const onClose = vi.fn();
  render(
    <MisCustomerDrillDown
      open
      onClose={onClose}
      rowId="new-arr"
      rowLabel="New"
      periodColumn="2024/12/31 - 2025/12/31"
      chips={[]}
      requestKey="new-arr|2025-12-31"
      state={loaded([NORTHWIND])}
      {...over}
    />,
  );
  return { onClose };
}

describe("what the dialog says it is showing", () => {
  it("names the figure that was opened — the row and the Period", () => {
    // The title is `${rowLabel} · ${periodColumn}` with a middle dot.
    // It is the only thing on screen tying the list back to the cell the reader
    // clicked, and a customer list with no such tie is unreadable.
    renderDialog();
    expect(screen.getByRole("dialog")).toHaveAccessibleName(/New · 2024\/12\/31 - 2025\/12\/31/);
  });

  it("shows the filters the figure was computed under, and lets nobody change them", () => {
    // Read-only on purpose: these are the Build's Applied filters, and a filter
    // changed from inside the dialog would leave the list describing a
    // different figure from the one it was opened from. The chip strip becomes
    // undismissable by omitting onRemove.
    renderDialog({
      chips: [{ key: "salesRegion", label: "Region: EMEA", removable: true }],
    });
    // Scoped to the strip: the customer row below happens to be in EMEA too,
    // which is exactly the sort of collision a dialog like this will hit.
    const strip = screen.getByRole("list");
    expect(within(strip).getByText("Region: EMEA")).toBeInTheDocument();
    expect(within(strip).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("the customers themselves", () => {
  it("keeps the list at the dialog's own height", () => {
    // The page tables grow to the shared cap and the page scrolls past them.
    // This list is inside a dialog. That cap is taller than the dialog, so
    // the list would scroll inside a scroller that itself does not fit. The
    // loading state is the same 420, so the dialog does not jump when the
    // rows arrive.
    renderDialog();
    expect(screen.getByRole("region", { name: "Customers behind this figure" })).toHaveStyle({
      maxHeight: "420px",
    });
  });

  it("lists one row per customer, under the column headings", () => {
    renderDialog();
    const table = screen.getByRole("table");
    expect(within(table).getByText("0018000001abcXYZ")).toBeInTheDocument();
    expect(within(table).getByText("Northwind Bank")).toBeInTheDocument();
    expect(within(table).getByText("750,000.00")).toBeInTheDocument();
  });

  it("shows eleven columns on an ordinary movement", () => {
    renderDialog();
    expect(within(screen.getByRole("table")).getAllByRole("columnheader")).toHaveLength(11);
  });

  it("shows thirteen on a Lost row, because those customers have a reason", () => {
    renderDialog({ rowId: "lost", rowLabel: "Lost" });
    const headers = within(screen.getByRole("table")).getAllByRole("columnheader");
    expect(headers).toHaveLength(13);
    expect(headers.map((h) => h.textContent)).toContain("Lost Reason");
  });

  it("writes the amount at units even though the Build behind it may be in thousands", () => {
    renderDialog({ state: loaded([{ ...NORTHWIND, amount: 1234567.5 }]) });
    expect(screen.getByText("1,234,567.50")).toBeInTheDocument();
  });
});

describe("when there is nothing to show", () => {
  it("holds the space while it loads rather than flashing an empty list", () => {
    renderDialog({ state: { ...loaded([]), isLoading: true } });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("says plainly when the figure has no customers behind it", () => {
    renderDialog({ state: loaded([]) });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText(/no customers/i)).toBeInTheDocument();
  });

  it("says the request FAILED rather than showing an empty list", () => {
    // A failed drill-down must not render an empty grid. On a screen whose
    // entire purpose is to explain a figure, that reads as "this number is
    // made of nobody".
    const retry = vi.fn();
    renderDialog({
      state: { customers: [], isLoading: false, isError: true, errorMessage: "Gateway said no.", retry },
    });
    expect(screen.getByText(/Gateway said no/)).toBeInTheDocument();
    expect(screen.queryByText(/no customers/i)).not.toBeInTheDocument();
  });
});

describe("closing it", () => {
  it("closes on the close button", async () => {
    const { onClose } = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape, because a modal over a report must be dismissable", async () => {
    const { onClose } = renderDialog();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("renders nothing at all while shut", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// The export is an .xlsx from the shared builders. A bespoke CSV here would
// be a second export path, and a column of text cannot be summed.
describe("taking the customers out of the browser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the customer list, with the amount as a number", async () => {
    const { blobs, filenames } = captureDownloads();
    renderDialog({ state: loaded([{ ...NORTHWIND, amount: 1_234_567.5 }]) });

    await userEvent.click(screen.getByRole("button", { name: /^export$/i }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /^excel/i }));
    await waitFor(() => expect(blobs).toHaveLength(1));

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await bytesOf(blobs[0]));
    const sheet = workbook.getWorksheet("Customers")!;

    // The dialog shows "1,234,567.50". The file gets the figure — a customer
    // list is exported to be summed against the Build figure it was opened
    // from, and a column of strings cannot be.
    //
    // The dialog takes no Scale at all. `drillDownColumns`' amount hard-codes
    // units, so there is no setting under which this figure could arrive
    // scaled, and the assertion that it is the raw one is the whole
    // guarantee.
    expect(sheet.getRow(4).getCell(3).value).toBe(1_234_567.5);

    // Two clean-up rules: the row label loses its punctuation, the Period
    // column keeps its hyphen. The date is Pacific, not UTC.
    expect(filenames[0]).toMatch(
      /^customer_details_new_20241231_-_20251231_\d{4}-\d{2}-\d{2}\.xlsx$/,
    );
  });

  it("offers nothing to export before there is a list", async () => {
    renderDialog({ state: { ...loaded([]), isLoading: true } });
    expect(screen.queryByRole("button", { name: /export/i })).not.toBeInTheDocument();
  });
});

describe("finding one customer in the list", () => {
  const BOOK: DrillDownCustomer[] = [
    NORTHWIND,
    { ...NORTHWIND, accountId: "a2", name: "Contoso", amount: 90_000, accountOwner: "Jane Roe" },
    { ...NORTHWIND, accountId: "a3", name: "North Star Ltd", amount: 12_000, accountOwner: undefined },
  ];
  const table = () => screen.getByRole("table", { name: "Customers behind this figure", hidden: true });
  const bodyRows = () =>
    within(table())
      .getAllByRole("row", { hidden: true })
      .slice(1)
      .map((row) => row.children[1]?.textContent ?? "");
  const header = (name: RegExp) => within(table()).getByRole("columnheader", { name, hidden: true });
  const startsWith = (label: string) => new RegExp(`^${label.replace(/[()]/g, "\\$&")}`);
  const sortButton = (label: string) => within(header(startsWith(label))).getByRole("button", { name: label });
  beforeEach(() => {
    renderDialog({ state: loaded(BOOK) });
  });

  it("sorts every column: ascending, descending, then off", async () => {
    const before = bodyRows();
    for (const label of ["Account ID", "Account Name", "Amount (USD)", "Account Owner"]) {
      await userEvent.click(sortButton(label));
      expect(header(startsWith(label)), `${label} ascending`).toHaveAttribute("aria-sort", "ascending");
      await userEvent.click(sortButton(label));
      expect(header(startsWith(label)), `${label} descending`).toHaveAttribute("aria-sort", "descending");
      await userEvent.click(sortButton(label));
      expect(header(startsWith(label)), `${label} off`).not.toHaveAttribute("aria-sort");
    }
    expect(bodyRows()).toEqual(before);
  }, 30_000);

  it("orders the amounts as numbers, and puts a missing owner last", async () => {
    await userEvent.click(sortButton("Amount (USD)"));
    expect(bodyRows()).toEqual(["North Star Ltd", "Contoso", "Northwind Bank"]);
    await userEvent.click(sortButton("Amount (USD)"));
    expect(bodyRows()).toEqual(["Northwind Bank", "Contoso", "North Star Ltd"]);
    await userEvent.click(sortButton("Amount (USD)"));
    await userEvent.click(sortButton("Account Owner"));
    expect(bodyRows().at(-1)).toBe("North Star Ltd");
    await userEvent.click(sortButton("Account Owner"));
    expect(bodyRows().at(-1)).toBe("North Star Ltd");
  });

  it("filters the text columns by what they contain, ignoring case", async () => {
    await userEvent.click(screen.getByRole("button", { name: /^Filter by Account Name/, hidden: true }));
    await userEvent.type(await screen.findByLabelText("Filter Account Name"), "NORTH");
    expect(bodyRows()).toEqual(["Northwind Bank", "North Star Ltd"]);
  });

  it("offers no text filter on the Amount, which is a figure", () => {
    expect(screen.queryByRole("button", { name: /^Filter by Amount/, hidden: true })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Filter by Account Name/, hidden: true })).toBeInTheDocument();
  });

  it("exports the rows as sorted and filtered, in Excel", async () => {
    const { blobs } = captureDownloads();
    await userEvent.click(screen.getByRole("button", { name: /^Filter by Account Name/, hidden: true }));
    await userEvent.type(await screen.findByLabelText("Filter Account Name"), "north");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByLabelText("Filter Account Name")).not.toBeInTheDocument());
    await userEvent.click(sortButton("Amount (USD)"));

    await userEvent.click(screen.getByRole("button", { name: /^export$/i }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /^excel/i }));
    await waitFor(() => expect(blobs).toHaveLength(1));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await bytesOf(blobs[0]));
    const names: string[] = [];
    workbook.getWorksheet("Customers")!.eachRow((row) => names.push(String(row.getCell(2).value ?? "")));
    expect(names.filter((name) => /north/i.test(name))).toEqual(["North Star Ltd", "Northwind Bank"]);
    expect(names).not.toContain("Contoso");
  });
});

describe("a filter stays with its request", () => {
  const BOOK: DrillDownCustomer[] = [
    NORTHWIND,
    { ...NORTHWIND, accountId: "a2", name: "Contoso", amount: 90_000 },
    { ...NORTHWIND, accountId: "a3", name: "North Star Ltd", amount: 12_000 },
  ];
  const view = (customers: DrillDownCustomer[], requestKey: string) => (
    <MisCustomerDrillDown
      open
      onClose={() => {}}
      rowId="new-arr"
      rowLabel="New"
      periodColumn="2024/12/31 - 2025/12/31"
      chips={[]}
      requestKey={requestKey}
      state={loaded(customers)}
    />
  );
  const names = () =>
    within(screen.getByRole("table", { name: "Customers behind this figure", hidden: true }))
      .getAllByRole("row", { hidden: true })
      .slice(1)
      .map((row) => row.children[1]?.textContent ?? "");

  it("keeps the filter when the same request returns a new list, and clears it for a new request", async () => {
    const { rerender } = render(view(BOOK, "new-arr|2025-12-31"));
    await userEvent.click(screen.getByRole("button", { name: /^Filter by Account Name/, hidden: true }));
    await userEvent.type(await screen.findByLabelText("Filter Account Name"), "NORTH");
    expect(names()).toEqual(["Northwind Bank", "North Star Ltd"]);

    rerender(view(BOOK.map((customer) => ({ ...customer })), "new-arr|2025-12-31"));
    expect(names()).toEqual(["Northwind Bank", "North Star Ltd"]);

    rerender(view(BOOK, "lost|2025-12-31"));
    expect(names()).toEqual(["Northwind Bank", "Contoso", "North Star Ltd"]);
  });
});
