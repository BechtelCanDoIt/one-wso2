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
import SupportingDocumentsCard, { SupportingDocumentsSummary } from "./SupportingDocumentsCard";
import SupportingDocumentsSection from "./detail/SupportingDocumentsSection";
import type { QuoteSupportingDocuments, SupportingDocument } from "@features/sales/cado2/quotes/api/useSupportingDocuments";

const doc = (id: number, title: string, pageCount: number): SupportingDocument => ({
  id,
  title,
  pageCount,
  sizeBytes: 1000,
  fileName: "x.pdf",
  versionNumber: 1,
  retired: false,
  updatedAt: "2026-10-27T10:00:00Z",
});
let library: SupportingDocument[] = [];
let quote: QuoteSupportingDocuments = { documents: [], retired: [], issued: false, canChange: true };
const set = { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null };
vi.mock("@features/sales/cado2/quotes/api/useSupportingDocuments", async (actual) => {
  const real = await actual<typeof import("@features/sales/cado2/quotes/api/useSupportingDocuments")>();
  return {
    ...real,
    useSupportingDocumentLibrary: () => ({ data: library, isPending: false, error: null }),
    useQuoteSupportingDocuments: () => ({ data: quote, isPending: false, error: null }),
    useSetQuoteSupportingDocuments: () => set,
    useHasSupportingDocuments: () =>
      quote.documents.length > 0 || quote.retired.length > 0 || (quote.canChange && library.length > 0),
  };
});

const policy = doc(1, "Support Policy", 12);
const security = doc(2, "Security Overview", 6);
const partner = doc(3, "Partner Programme Terms", 4);

// DGD-10: the documents that follow the order form.
describe("Supporting documents", () => {
  beforeEach(() => {
    set.mutate.mockClear();
    library = [policy, security, partner];
    quote = { documents: [], retired: [], issued: false, canChange: true };
  });

  it("isn't shown on the Legal step while the library is empty", () => {
    library = [];
    render(<SupportingDocumentsCard quoteId={7} />);
    expect(screen.queryByRole("region", { name: "Supporting Documents" })).toBeNull();
  });

  it("ticks a document on the Legal step and saves it at once, nothing ticked to start with", async () => {
    quote = { ...quote, documents: [{ id: 1, title: "Support Policy", pageCount: 12 }] };
    render(<SupportingDocumentsCard quoteId={7} />);
    const card = within(screen.getByRole("region", { name: "Supporting Documents" }));
    expect(card.getByText("Added at the end of the order form PDF.")).toBeInTheDocument();
    expect(card.getByRole("checkbox", { name: /Support Policy/ })).toBeChecked();
    expect(card.getByRole("checkbox", { name: /Security Overview/ })).not.toBeChecked();
    expect(card.getByText("6 pages")).toBeInTheDocument();

    await userEvent.setup().click(card.getByRole("checkbox", { name: /Partner Programme Terms/ }));
    expect(set.mutate).toHaveBeenCalledWith([1, 3]);
  });

  it("says when a ticked document was retired", () => {
    quote = { ...quote, retired: ["Partner Programme Terms"] };
    render(<SupportingDocumentsCard quoteId={7} />);
    expect(screen.getByText("Partner Programme Terms was retired by an Admin, so it's no longer added.")).toBeInTheDocument();
  });

  it("names them in one line on Review", () => {
    quote = { ...quote, documents: [{ id: 1, title: "Support Policy", pageCount: 12 }, { id: 3, title: "Partner Programme Terms", pageCount: 4 }] };
    render(<SupportingDocumentsSummary quoteId={7} />);
    expect(screen.getByText(/Support Policy, Partner Programme Terms, added after the order form/)).toBeInTheDocument();
  });

  // Option B: changed on the quote page until Issue, with no new approval.
  it("changes them on the quote page until Issue", async () => {
    quote = { ...quote, documents: [{ id: 1, title: "Support Policy", pageCount: 12 }] };
    render(<SupportingDocumentsSection quoteId={7} />);
    const user = userEvent.setup();
    const section = within(screen.getByRole("region", { name: "Supporting documents" }));
    expect(section.getByText("Support Policy")).toBeInTheDocument();

    await user.click(section.getByRole("button", { name: "Change" }));
    await user.click(section.getByRole("checkbox", { name: "Security Overview" }));
    await user.click(section.getByRole("checkbox", { name: "Support Policy" }));
    await user.click(section.getByRole("button", { name: "Save" }));
    expect(set.mutate).toHaveBeenCalledWith([2], expect.anything());
  });

  it("is fixed once the order form is issued", () => {
    quote = { documents: [{ id: 1, title: "Support Policy", pageCount: 12 }], retired: [], issued: true, canChange: false };
    render(<SupportingDocumentsSection quoteId={7} />);
    expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
    expect(screen.getByText("Included in the PDF.")).toBeInTheDocument();
  });

  it("shows nothing to an approver when none are ticked", () => {
    quote = { ...quote, canChange: false };
    const { container } = render(<SupportingDocumentsSection quoteId={7} />);
    expect(container).toBeEmptyDOMElement();
  });
});
