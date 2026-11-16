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
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { adminProductRow } from "../../testing/fixtures";

const http = vi.hoisted(() => ({
  authedGet: vi.fn(),
  authedPost: vi.fn(),
  authedPatch: vi.fn(),
  authedPut: vi.fn(),
  authedDelete: vi.fn(),
}));

vi.mock("@asgardeo/react", () => ({ useAsgardeo: () => ({ isSignedIn: true }) }));
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
vi.mock("@hooks/useAsgardeoSub", () => ({
  useAsgardeoSub: () => ({ state: { status: "ready", sub: "admin" }, retry: () => {} }),
  foldIdentityError: (query: unknown) => query,
}));
vi.mock("@config/apiConfig", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@config/apiConfig")>()),
  isSwagStoreBackendConfigured: () => true,
}));
vi.mock("@api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@api/http")>()),
  authedGet: http.authedGet,
  authedPost: http.authedPost,
  authedPatch: http.authedPatch,
  authedPut: http.authedPut,
  authedDelete: http.authedDelete,
}));

import { HttpError } from "@api/http";
import ProductsPage from "./ProductsPage";

const originalConfig = window.config;

function Where() {
  const { pathname } = useLocation();
  return <output data-testid="where">{pathname}</output>;
}

function renderPage(
  path = "/people-ops/swag-store/products/active",
  client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } }),
) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/people-ops/swag-store/products/:tab" element={<ProductsPage />} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.config = { ...(originalConfig ?? {}), ONE_WSO2_PREVIEW_FEATURES: { swagStore: true } } as Window["config"];
  Object.values(http).forEach((f) => f.mockReset());
  http.authedGet.mockResolvedValue({ items: [adminProductRow()], total: 1 });
});

afterEach(() => {
  window.config = originalConfig;
});

describe("the admin products list", () => {
  it("lists one tab's products with free stock and recent sales, each linking to its editor", async () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Products" })).toBeInTheDocument();
    const row = await screen.findByRole("row", { name: /WSO2 Hoodie.*90 O2C.*23.*12/ });
    expect(within(row).getByRole("link", { name: "WSO2 Hoodie" })).toHaveAttribute("href", "/people-ops/swag-store/products/p-hoodie");
    expect(http.authedGet).toHaveBeenCalledWith("/admin/products?status=ACTIVE&limit=50&offset=0", "token");
    expect(screen.getByRole("tab", { name: "Active", selected: true })).toBeInTheDocument();
  });

  it("has a tab per status, as routes", async () => {
    renderPage();
    await screen.findByRole("row", { name: /WSO2 Hoodie/ });
    await userEvent.click(screen.getByRole("tab", { name: "Drafts" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/people-ops/swag-store/products/draft");
    await waitFor(() => expect(http.authedGet).toHaveBeenCalledWith("/admin/products?status=DRAFT&limit=50&offset=0", "token"));
  });

  it("offers a new product", async () => {
    renderPage();
    expect(screen.getByRole("link", { name: "New product" })).toHaveAttribute("href", "/people-ops/swag-store/products/new");
  });

  it("goes back to the last page with products when its page empties, never saying the tab is empty", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => adminProductRow({ id: `p-${i}`, name: `Product ${i}` }));
    let total = 51;
    http.authedGet.mockImplementation(async (url: string) =>
      url.endsWith("offset=0") ? { items: page1, total } : { items: total > 50 ? [adminProductRow()] : [], total },
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
    renderPage(undefined, client);
    await screen.findByRole("row", { name: /Product 0/ });
    await userEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
    await screen.findByRole("row", { name: /WSO2 Hoodie/ });
    // The hoodie moved to another tab; page 2 now reads back empty.
    total = 50;
    await act(() => client.invalidateQueries());
    expect(await screen.findByRole("row", { name: /Product 0/ })).toBeInTheDocument();
    expect(screen.queryByText("No active products.")).toBeNull();
  });

  it("says when a tab is empty, and shows a failure with Retry", async () => {
    http.authedGet.mockResolvedValueOnce({ items: [], total: 0 });
    const { unmount } = renderPage("/people-ops/swag-store/products/removed");
    expect(await screen.findByText("No removed products.")).toBeInTheDocument();
    unmount();
    http.authedGet.mockRejectedValue(new HttpError("/admin/products", 503, JSON.stringify({ message: "Database is down." })));
    renderPage();
    expect(await screen.findByText(/Couldn't load the products/)).toBeInTheDocument();
  });
});
