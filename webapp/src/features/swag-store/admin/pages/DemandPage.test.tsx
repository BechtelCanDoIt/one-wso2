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
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { adminProduct, demandRow } from "../../testing/fixtures";
import { formatCivilDate } from "../../util/civilDate";

const http = vi.hoisted(() => ({ authedGet: vi.fn(), authedPatch: vi.fn() }));

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
  authedPatch: http.authedPatch,
}));

import { HttpError } from "@api/http";
import DemandPage from "./DemandPage";

const originalConfig = window.config;

const ROWS = [
  demandRow({ variantId: "v-m", sku: "HOODIE-M", options: "M", pendingAlerts: 3, firstAlertAt: "2026-11-10T05:00:00Z", free: 0 }),
  demandRow({ variantId: "v-l", sku: "HOODIE-L", options: "L", pendingAlerts: 2, firstAlertAt: "2026-11-08T05:00:00Z", restockEta: "2026-12-12T00:00:00Z" }),
  demandRow({
    productId: "p-speaker",
    productName: "WSO2 Bluetooth Speaker",
    variantId: "v-speaker",
    sku: "SPEAKER",
    options: "",
    pendingAlerts: 1,
    firstAlertAt: "2026-11-12T05:00:00Z",
  }),
];

function Where() {
  const { pathname } = useLocation();
  return <output data-testid="where">{pathname}</output>;
}

function renderPage(path = "/people-ops/swag-store/demand") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/people-ops/swag-store/demand" element={<DemandPage />} />
          <Route path="/people-ops/swag-store/demand/:productId" element={<DemandPage />} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // Today is 15 Nov 2026, so the fixtures' December dates stay in the future.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T12:00:00Z")); // midday UTC: 15 Nov in every timezone the tests run in
  window.config = { ...(originalConfig ?? {}), ONE_WSO2_PREVIEW_FEATURES: { swagStore: true } } as Window["config"];
  Object.values(http).forEach((f) => f.mockReset());
  http.authedGet.mockResolvedValue({ items: ROWS });
});

afterEach(() => {
  vi.useRealTimers();
  window.config = originalConfig;
});

describe("the demand board", () => {
  it("lists products most wanted first, with how many wait, since when, and the next restock date", async () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Demand" })).toBeInTheDocument();
    const rows = await screen.findAllByRole("row");
    const body = rows.slice(1);
    expect(body).toHaveLength(2);
    expect(within(body[0]).getByRole("link", { name: "WSO2 Hoodie" })).toHaveAttribute("href", "/people-ops/swag-store/demand/p-hoodie");
    expect(body[0]).toHaveTextContent(/5 people/);
    expect(body[0]).toHaveTextContent(/2 options/);
    expect(body[0]).toHaveTextContent(formatCivilDate("2026-12-12") ?? "missing");
    expect(body[1]).toHaveTextContent(/WSO2 Bluetooth Speaker/);
    expect(body[1]).toHaveTextContent(/1 person/);
    expect(body[1]).toHaveTextContent("Not set");
    expect(http.authedGet).toHaveBeenCalledWith("/admin/demand", "token");
    expect(screen.getByRole("table", { name: "Demand" })).toBeInTheDocument();
  });

  it("marks a restock date that has passed as overdue", async () => {
    http.authedGet.mockResolvedValue({ items: [demandRow({ restockEta: "2026-11-01T00:00:00Z" })] });
    renderPage();
    const [, row] = await screen.findAllByRole("row");
    expect(row).toHaveTextContent(formatCivilDate("2026-11-01") ?? "missing");
    expect(within(row).getByText("Overdue")).toBeInTheDocument();
  });

  it("says when nobody is waiting", async () => {
    http.authedGet.mockResolvedValue({ items: [] });
    renderPage();
    expect(await screen.findByText("Nobody is waiting for anything right now.")).toBeInTheDocument();
  });

  it("shows a failure with Retry", async () => {
    http.authedGet.mockRejectedValue(new HttpError("/admin/demand", 503, JSON.stringify({ message: "Database is down." })));
    renderPage();
    expect(await screen.findByText(/Couldn't load the demand board/)).toBeInTheDocument();
    http.authedGet.mockResolvedValue({ items: ROWS });
    await userEvent.click(screen.getByRole("button", { name: /Retry/ }));
    expect(await screen.findByRole("link", { name: "WSO2 Hoodie" })).toBeInTheDocument();
  });
});

describe("a product's drawer", () => {
  it("shows each waiting option, and links to the editor to receive stock", async () => {
    renderPage("/people-ops/swag-store/demand/p-hoodie");
    const drawer = await screen.findByRole("dialog", { name: "WSO2 Hoodie" });
    const m = within(drawer).getByRole("group", { name: "M" });
    expect(m).toHaveTextContent(/3 waiting/);
    expect(m).toHaveTextContent(/0 free/);
    expect(within(drawer).getByRole("group", { name: "L" })).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: "Receive stock" })).toHaveAttribute("href", "/people-ops/swag-store/products/p-hoodie");
    expect(drawer).toHaveTextContent("Receiving stock emails everyone waiting for that option.");
  });

  it("saves a restock date for one option", async () => {
    http.authedPatch.mockResolvedValue(adminProduct());
    renderPage("/people-ops/swag-store/demand/p-hoodie");
    const m = within(await screen.findByRole("dialog", { name: "WSO2 Hoodie" })).getByRole("group", { name: "M" });
    const date = within(m).getByLabelText("Restock date");
    await userEvent.type(date, "2026-12-24");
    await userEvent.click(within(m).getByRole("button", { name: "Save date" }));
    expect(http.authedPatch).toHaveBeenCalledWith("/admin/products/p-hoodie/variants/v-m", "token", { restockEta: "2026-12-24" });
    expect(await within(m).findByText("Saved.")).toBeInTheDocument();
  });

  it("saves only a changed date, and never one in the past", async () => {
    renderPage("/people-ops/swag-store/demand/p-hoodie");
    const l = within(await screen.findByRole("dialog", { name: "WSO2 Hoodie" })).getByRole("group", { name: "L" });
    const save = within(l).getByRole("button", { name: "Save date" });
    expect(save).toBeDisabled();
    const date = within(l).getByLabelText("Restock date");
    expect(date).toHaveAttribute("min", "2026-11-15");
    await userEvent.clear(date);
    await userEvent.type(date, "2026-11-01");
    expect(within(l).getByText("Pick today or a later date.")).toBeInTheDocument();
    expect(save).toBeDisabled();
    await userEvent.clear(date);
    await userEvent.type(date, "2026-11-15");
    expect(save).toBeEnabled();
  });

  it("opens an overdue saved date without an error, and flags it only once changed to another past date", async () => {
    http.authedGet.mockResolvedValue({ items: [ROWS[0], demandRow({ ...ROWS[1], restockEta: "2026-11-01T00:00:00Z" })] });
    renderPage("/people-ops/swag-store/demand/p-hoodie");
    const l = within(await screen.findByRole("dialog", { name: "WSO2 Hoodie" })).getByRole("group", { name: "L" });
    const date = within(l).getByLabelText("Restock date");
    expect(date).toHaveValue("2026-11-01");
    expect(within(l).queryByText("Pick today or a later date.")).toBeNull();
    await userEvent.clear(date);
    await userEvent.type(date, "2026-11-02");
    expect(within(l).getByText("Pick today or a later date.")).toBeInTheDocument();
  });

  it("says Saved. only until the date is changed again", async () => {
    http.authedPatch.mockResolvedValue(adminProduct());
    renderPage("/people-ops/swag-store/demand/p-hoodie");
    const m = within(await screen.findByRole("dialog", { name: "WSO2 Hoodie" })).getByRole("group", { name: "M" });
    const date = within(m).getByLabelText("Restock date");
    await userEvent.type(date, "2026-12-24");
    await userEvent.click(within(m).getByRole("button", { name: "Save date" }));
    expect(await within(m).findByText("Saved.")).toBeInTheDocument();
    await userEvent.clear(date);
    expect(within(m).queryByText("Saved.")).toBeNull();
  });

  /** Saves M on 24 Dec; the board read that follows says L is now due on `lDue`, as if someone else set it. */
  async function saveMWhileLMovesTo(drawer: HTMLElement, lDue: string) {
    http.authedPatch.mockResolvedValue(adminProduct());
    http.authedGet.mockResolvedValue({
      items: [{ ...ROWS[0], restockEta: "2026-12-24T00:00:00Z" }, { ...ROWS[1], restockEta: `${lDue}T00:00:00Z` }, ROWS[2]],
    });
    const m = within(drawer).getByRole("group", { name: "M" });
    await userEvent.type(within(m).getByLabelText("Restock date"), "2026-12-24");
    await userEvent.click(within(m).getByRole("button", { name: "Save date" }));
    await within(m).findByText("Saved.");
  }

  it("follows a saved date someone else changed, while the field is untouched", async () => {
    renderPage("/people-ops/swag-store/demand/p-hoodie");
    const drawer = await screen.findByRole("dialog", { name: "WSO2 Hoodie" });
    const l = within(drawer).getByRole("group", { name: "L" });
    await saveMWhileLMovesTo(drawer, "2026-12-20");
    await waitFor(() => expect(within(l).getByLabelText("Restock date")).toHaveValue("2026-12-20"));
    expect(within(l).getByRole("button", { name: "Save date" })).toBeDisabled();
  });

  it("keeps an unsaved edit when the saved date changes underneath it", async () => {
    renderPage("/people-ops/swag-store/demand/p-hoodie");
    const drawer = await screen.findByRole("dialog", { name: "WSO2 Hoodie" });
    const l = within(drawer).getByRole("group", { name: "L" });
    const date = within(l).getByLabelText("Restock date");
    await userEvent.clear(date);
    await userEvent.type(date, "2026-12-28");
    await saveMWhileLMovesTo(drawer, "2026-12-20");
    expect(date).toHaveValue("2026-12-28");
    expect(within(l).getByRole("button", { name: "Save date" })).toBeEnabled();
  });

  it("stays open with an unsaved edit when the board read after a save fails, until Retry catches up", async () => {
    renderPage("/people-ops/swag-store/demand/p-hoodie");
    const drawer = await screen.findByRole("dialog", { name: "WSO2 Hoodie" });
    const l = within(drawer).getByRole("group", { name: "L" });
    const date = within(l).getByLabelText("Restock date");
    await userEvent.clear(date);
    await userEvent.type(date, "2026-12-28");
    http.authedPatch.mockResolvedValue(adminProduct());
    http.authedGet.mockRejectedValue(new HttpError("/admin/demand", 503, JSON.stringify({ message: "Database is down." })));
    const m = within(drawer).getByRole("group", { name: "M" });
    await userEvent.type(within(m).getByLabelText("Restock date"), "2026-12-24");
    await userEvent.click(within(m).getByRole("button", { name: "Save date" }));
    expect(await within(drawer).findByText(/Couldn't refresh the demand board/)).toHaveTextContent("Database is down.");
    expect(screen.getByRole("dialog", { name: "WSO2 Hoodie" })).toBe(drawer);
    expect(date).toHaveValue("2026-12-28");

    http.authedGet.mockResolvedValue({ items: [{ ...ROWS[0], restockEta: "2026-12-24T00:00:00Z" }, ROWS[1], ROWS[2]] });
    await userEvent.click(within(drawer).getByRole("button", { name: /Retry/ }));
    await waitFor(() => expect(within(drawer).queryByText(/Couldn't refresh the demand board/)).toBeNull());
    expect(date).toHaveValue("2026-12-28");
    expect(within(l).getByRole("button", { name: "Save date" })).toBeEnabled();
  });

  it("holds the date while saving, so a failed save still shows its error", async () => {
    let fail: (error: unknown) => void = () => {};
    http.authedPatch.mockImplementation(() => new Promise((_, reject) => (fail = reject)));
    renderPage("/people-ops/swag-store/demand/p-hoodie");
    const m = within(await screen.findByRole("dialog", { name: "WSO2 Hoodie" })).getByRole("group", { name: "M" });
    const date = within(m).getByLabelText("Restock date");
    await userEvent.type(date, "2026-12-24");
    await userEvent.click(within(m).getByRole("button", { name: "Save date" }));
    expect(date).toBeDisabled();
    fail(new HttpError("/admin/products/p-hoodie/variants/v-m", 503, JSON.stringify({ message: "Database is down." })));
    expect(await within(m).findByRole("alert")).toHaveTextContent("Database is down.");
    expect(date).toBeEnabled();
  });

  it("clears a restock date", async () => {
    http.authedPatch.mockResolvedValue(adminProduct());
    renderPage("/people-ops/swag-store/demand/p-hoodie");
    const l = within(await screen.findByRole("dialog", { name: "WSO2 Hoodie" })).getByRole("group", { name: "L" });
    expect(within(l).getByLabelText("Restock date")).toHaveValue("2026-12-12");
    await userEvent.clear(within(l).getByLabelText("Restock date"));
    await userEvent.click(within(l).getByRole("button", { name: "Save date" }));
    expect(http.authedPatch).toHaveBeenCalledWith("/admin/products/p-hoodie/variants/v-l", "token", { restockEta: null });
  });

  it("names a default option and says when nobody waits for the product any more", async () => {
    renderPage("/people-ops/swag-store/demand/p-speaker");
    const drawer = await screen.findByRole("dialog", { name: "WSO2 Bluetooth Speaker" });
    expect(within(drawer).getByRole("group", { name: "SPEAKER" })).toBeInTheDocument();
    await userEvent.click(within(drawer).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/people-ops\/swag-store\/demand$/));
  });

  it("says when nobody is waiting for that product now", async () => {
    renderPage("/people-ops/swag-store/demand/p-gone");
    expect(await screen.findByText("Nobody is waiting for this product now.")).toBeInTheDocument();
  });
});
