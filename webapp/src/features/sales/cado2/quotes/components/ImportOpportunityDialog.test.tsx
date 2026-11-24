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
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImportOpportunityDialog from "./ImportOpportunityDialog";

const product = (id: string, name: string) => ({
  id, name, productCode: `C-${id}`, description: null, family: null, unitOfMeasure: null, productUnit: null, classification: "PS",
  category: "SUBSCRIPTION" as const, recurring: true, classificationProblem: null,
  pricebookEntries: [{ id: `01u${id}`, unitPrice: "20700", currencyIsoCode: "USD", isActive: true, pricebook: { id: "01sUSD", name: "USD Price Book" } }],
});
const sfLine = (id: string, p: ReturnType<typeof product>, quantity: string, status = "READY", reason: string | null = null) => ({
  id, productName: p.name, productCode: p.productCode, quantity, salesPrice: "20700", discount: "10", totalPrice: null,
  commissionPercent: null, serviceStartDate: null, serviceEndDate: null, status, reason, product: p,
});
const mi = product("01tMI", "WSO2 Micro Integrator");
const support = product("01tES", "Enterprise Support");
// D178: Micro Integrator listed twice on the renewal opportunity, and once more to change.
const data = {
  opportunityName: "Acme - Renewal 2027", currency: "USD",
  lines: [sfLine("00k1", mi, "4"), sfLine("00k2", mi, "2"), sfLine("00k3", support, "1"), sfLine("00k4", mi, "2.5", "CHANGE", "Quantity 2.5")],
};
vi.mock("@features/sales/cado2/quotes/api/useQuoteApi", () => ({
  useOpportunityImport: () => ({ data, error: null, isPending: false, isFetching: false, refetch: vi.fn() }),
  usePricingFormulas: () => ({ data: [], error: null, isPending: false }),
}));

describe("ImportOpportunityDialog (D178)", () => {
  it("lets one line of a product listed twice be ticked at a time", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <ImportOpportunityDialog
        open
        opportunityId="006A"
        currency="USD"
        pricebookId="01sUSD"
        year={{ number: 1, start: "2027-01-01", end: "2027-12-31" }}
        changed={new Set()}
        onQuote={new Set()}
        onAdd={onAdd}
        onChange={() => {}}
        onClose={() => {}}
      />,
    );
    const dialog = within(screen.getByRole("dialog", { name: /Import from opportunity/ }));
    const [first, second] = dialog.getAllByRole("checkbox", { name: "Add WSO2 Micro Integrator" });
    expect(first).toBeChecked();
    expect(second).not.toBeChecked();
    expect(second).toBeDisabled();
    // The line to change can't add it either while one is ticked.
    expect(dialog.queryByRole("button", { name: "Change and add" })).toBeNull();
    expect(dialog.getAllByText("Same product as a ticked line")).toHaveLength(2);
    expect(dialog.getByRole("button", { name: "Add 2 products" })).toBeEnabled();

    // Untick the first: the second can be ticked instead, and the change line opens up.
    await user.click(first);
    expect(second).toBeEnabled();
    expect(dialog.getByRole("button", { name: "Change and add" })).toBeEnabled();
    await user.click(second);
    expect(first).toBeDisabled();
    await user.click(dialog.getByRole("button", { name: "Add 2 products" }));
    expect(onAdd.mock.calls[0][0].map((p: { quantity: string }) => p.quantity)).toEqual(["2", "1"]);
  });

  it("selects one line per product with the header box", async () => {
    const user = userEvent.setup();
    render(
      <ImportOpportunityDialog
        open
        opportunityId="006A"
        currency="USD"
        pricebookId="01sUSD"
        year={{ number: 1, start: "2027-01-01", end: "2027-12-31" }}
        changed={new Set()}
        onQuote={new Set()}
        onAdd={() => {}}
        onChange={() => {}}
        onClose={() => {}}
      />,
    );
    const dialog = within(screen.getByRole("dialog", { name: /Import from opportunity/ }));
    const all = dialog.getByRole("checkbox", { name: "Select every product that can be added as it is" });
    expect(all).toBeChecked();
    await user.click(all);
    expect(dialog.getByRole("button", { name: "Add products" })).toBeDisabled();
    await user.click(all);
    expect(dialog.getByRole("button", { name: "Add 2 products" })).toBeEnabled();
  });
});
