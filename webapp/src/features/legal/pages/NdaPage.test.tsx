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

import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { CustomerResult } from "@features/legal/api/useCustomerSearch";
import type { NdaPdfProps } from "@features/legal/pages/NdaPdfDocument";
import NdaPage from "@features/legal/pages/NdaPage";

vi.mock("@config/apiConfig", () => ({
  isLegalBackendConfigured: () => true,
  legalServiceUrls: { customerSearch: "/customer-search", me: "/me" },
}));

const ACME_LANKA: CustomerResult = {
  id: "001",
  name: "Acme Lanka",
  subRegion: null,
  subIndustry: null,
  salesRegion: null,
  address: {
    billingStreet: "1 Main Street",
    billingCity: "Colombo",
    billingState: null,
    billingPostalCode: null,
    billingCountry: "Sri Lanka",
  },
};

vi.mock("@features/legal/api/useCustomerSearch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/legal/api/useCustomerSearch")>()),
  useCustomerSearch: () => ({ data: [ACME_LANKA], isFetching: false }),
}));

// Capture what the page asks the PDF renderer to draw, instead of drawing it.
const rendered = vi.hoisted(() => ({ props: null as NdaPdfProps | null }));
vi.mock("@react-pdf/renderer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@react-pdf/renderer")>()),
  pdf: (element: { props: NdaPdfProps }) => {
    rendered.props = element.props;
    return { toBlob: async () => new Blob(["%PDF-"]) };
  },
}));

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:nda");
  URL.revokeObjectURL = vi.fn();
});

type Access = { isPending: boolean; isError: boolean; data?: { canSearchSalesforce: boolean } };
const access = vi.hoisted(() => ({ value: {} as Access }));
vi.mock("@features/legal/api/useNdaAccess", () => ({
  useNdaAccess: () => access.value,
}));

function renderPage(a: Access) {
  access.value = a;
  return render(
    <MemoryRouter>
      <NdaPage />
    </MemoryRouter>,
  );
}

describe("NdaPage counterparty", () => {
  it("offers Salesforce search and manual entry to the Salesforce search groups", () => {
    renderPage({ isPending: false, isError: false, data: { canSearchSalesforce: true } });
    expect(screen.getByRole("button", { name: "Salesforce customer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enter details manually" })).toBeInTheDocument();
    expect(screen.getByLabelText("Customer Name")).toBeInTheDocument();
  });

  it("offers only manual entry to everyone else", () => {
    renderPage({ isPending: false, isError: false, data: { canSearchSalesforce: false } });
    expect(screen.queryByRole("button", { name: "Salesforce customer" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Customer Name")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Legal name/ })).toBeInTheDocument();
  });

  it("shows neither while access is being checked", () => {
    renderPage({ isPending: true, isError: false });
    expect(screen.getByLabelText("Checking your access")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salesforce customer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /Legal name/ })).not.toBeInTheDocument();
  });

  it("keeps the download button visible but disabled until the form is complete", () => {
    renderPage({ isPending: false, isError: false, data: { canSearchSalesforce: false } });
    expect(screen.getByRole("button", { name: /Download NDA PDF/ })).toBeDisabled();
  });

  it("falls back to manual entry, and says why, when access can't be checked", () => {
    renderPage({ isPending: false, isError: true });
    expect(screen.getByText(/Couldn't check whether you can search Salesforce customers/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salesforce customer" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Legal name/ })).toBeInTheDocument();
  });
});

describe("NdaPage counterparty and WSO2 company", () => {
  const allowed: Access = { isPending: false, isError: false, data: { canSearchSalesforce: true } };
  const wso2Company = () => screen.getByRole("combobox", { name: /WSO2 Company/ });

  async function pickSalesforceCustomer(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByRole("combobox", { name: "Customer Name" }), "Acme");
    await user.click(await screen.findByRole("option", { name: "Acme Lanka" }));
  }

  async function enterManualParty(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Enter details manually" }));
    await user.type(screen.getByRole("textbox", { name: /Legal name/ }), "Example Vendor Ltd");
    await user.type(screen.getByRole("textbox", { name: /Street address/ }), "1 Example Road");
    await user.type(screen.getByRole("textbox", { name: /City/ }), "London");
    await user.type(screen.getByRole("combobox", { name: /Country/ }), "United Kingdom");
    await user.click(await screen.findByRole("option", { name: "United Kingdom" }));
  }

  it("follows the active counterparty's country when switching between Salesforce and manual entry", async () => {
    const user = userEvent.setup();
    renderPage(allowed);

    await pickSalesforceCustomer(user);
    expect(wso2Company()).toHaveValue("WSO2 Lanka (Pvt) Ltd (LK)");

    // Manual entry has no country yet, so the Sri Lanka entity must not stay behind.
    await user.click(screen.getByRole("button", { name: "Enter details manually" }));
    expect(wso2Company()).toHaveValue("");

    await user.type(screen.getByRole("combobox", { name: /Country/ }), "United Kingdom");
    await user.click(await screen.findByRole("option", { name: "United Kingdom" }));
    expect(wso2Company()).toHaveValue("WSO2 (UK) Ltd (UK)");

    // Back to the Salesforce customer, back to its entity.
    await user.click(screen.getByRole("button", { name: "Salesforce customer" }));
    expect(wso2Company()).toHaveValue("WSO2 Lanka (Pvt) Ltd (LK)");
  });

  it("puts the active counterparty and its entity into the NDA", async () => {
    const user = userEvent.setup();
    renderPage(allowed);

    // A Salesforce customer chosen first must not leak into a manual NDA.
    await pickSalesforceCustomer(user);
    await enterManualParty(user);
    await user.click(screen.getByRole("button", { name: /Download NDA PDF/ }));

    await waitFor(() => expect(rendered.props).not.toBeNull());
    expect(rendered.props).toMatchObject({
      customerName: "Example Vendor Ltd",
      customerAddress: "1 Example Road, London, United Kingdom",
      wso2Company: "WSO2 (UK) Ltd \u2014 UK",
    });
  });
});
