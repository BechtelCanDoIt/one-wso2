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
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SupportingDocumentsPage from "./SupportingDocumentsPage";

const change = { mutate: vi.fn(), mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, error: null as unknown };
const doc = (id: number, title: string, retired = false) => ({
  id,
  title,
  pageCount: 12,
  sizeBytes: 1_468_006,
  fileName: `${title.replace(/ /g, "-")}.pdf`,
  versionNumber: 3,
  retired,
  updatedAt: "2026-10-14T10:00:00Z",
});
const library = {
  error: null,
  isPending: false,
  isFetching: false,
  refetch: vi.fn(),
  data: [doc(1, "Support Policy"), doc(2, "Security Overview"), doc(3, "Support Policy 2025", true), doc(4, "Partner Programme Terms")],
};
vi.mock("@features/sales/cado2/admin/supporting-documents/api/useSupportingDocumentsAdmin", () => ({
  useSupportingDocumentsAdmin: () => library,
  useSupportingDocumentsChange: () => change,
  useSupportingDocumentFile: () => vi.fn(),
}));

// DGD-10: the Admin's library of PDFs that follow the order form.
describe("SupportingDocumentsPage", () => {
  beforeEach(() => {
    change.mutate.mockClear();
    change.mutateAsync.mockClear();
  });

  it("lists the documents in use with their file, pages and size; retired ones on request", async () => {
    render(<SupportingDocumentsPage />);
    const table = within(screen.getByRole("table", { name: "Supporting documents" }));
    expect(table.getByText("Support Policy")).toBeInTheDocument();
    expect(table.getAllByText("12 pages · 1.4 MB")).toHaveLength(3);
    expect(table.getAllByText("Version 3")).toHaveLength(3);
    expect(table.queryByText("Support Policy 2025")).toBeNull();

    await userEvent.setup().click(screen.getByRole("switch", { name: "Show retired" }));
    expect(table.getByText("Support Policy 2025")).toBeInTheDocument();
    expect(table.getByRole("button", { name: "Restore Support Policy 2025" })).toBeInTheDocument();
  });

  // The order is the order they follow the order form; retired ones keep their places.
  it("moves a document down past the next one in use", async () => {
    render(<SupportingDocumentsPage />);
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: "Move Support Policy up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Partner Programme Terms down" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Move Security Overview down" }));
    expect(change.mutate).toHaveBeenCalledWith({ kind: "order", ids: [1, 4, 3, 2] });
  });

  it("adds a PDF with a title, and refuses anything else before uploading", async () => {
    render(<SupportingDocumentsPage />);
    const user = userEvent.setup({ applyAccept: false });
    await user.click(screen.getByRole("button", { name: "Add document" }));
    const dialog = within(screen.getByRole("dialog", { name: "Add Supporting Document" }));
    const add = dialog.getByRole("button", { name: "Add document" });
    expect(add).toBeDisabled();

    await user.type(dialog.getByRole("textbox", { name: /Title/ }), "Security Overview");
    await user.upload(dialog.getByLabelText("PDF file"), new File(["PK"], "terms.docx", { type: "application/msword" }));
    expect(dialog.getByText("Only PDF files can be added")).toBeInTheDocument();
    expect(add).toBeDisabled();

    await user.click(dialog.getByRole("button", { name: "Remove" }));
    const pdf = new File(["%PDF-1.7"], "security.pdf", { type: "application/pdf" });
    await user.upload(dialog.getByLabelText("PDF file"), pdf);
    expect(add).toBeEnabled();
    await user.click(add);
    expect(change.mutateAsync).toHaveBeenCalledWith({ kind: "add", title: "Security Overview", file: pdf });
  });

  it("replaces a file as a new version, keeping issued order forms as they are", async () => {
    render(<SupportingDocumentsPage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Replace Support Policy" }));
    const dialog = within(screen.getByRole("dialog", { name: "Replace Support Policy" }));
    expect(dialog.getByRole("button", { name: "Save title" })).toBeDisabled();

    const pdf = new File(["%PDF-1.7"], "support-v4.pdf", { type: "application/pdf" });
    await user.upload(dialog.getByLabelText("PDF file"), pdf);
    expect(dialog.getByText(/Becomes Version 4\. Quotes not yet issued use the new copy; issued order forms keep theirs/)).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Replace document" }));
    expect(change.mutateAsync).toHaveBeenCalledWith({ kind: "replace", id: 1, file: pdf });
  });

  it("asks before retiring, and says what happens to quotes", async () => {
    render(<SupportingDocumentsPage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retire Security Overview" }));
    const dialog = within(screen.getByRole("dialog", { name: "Retire Security Overview?" }));
    expect(dialog.getByText(/quotes not yet issued no longer include it\. Order forms already issued keep it/)).toBeInTheDocument();
    expect(change.mutate).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Retire document" }));
    expect(change.mutate).toHaveBeenCalledWith({ kind: "retire", id: 2 }, expect.anything());
  });
});
