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

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import NdaPage from "@features/legal/pages/NdaPage";

vi.mock("@config/apiConfig", () => ({
  isLegalBackendConfigured: () => true,
  legalServiceUrls: { customerSearch: "/customer-search", me: "/me" },
}));

vi.mock("@features/legal/api/useCustomerSearch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/legal/api/useCustomerSearch")>()),
  useCustomerSearch: () => ({ data: [], isFetching: false }),
}));

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
