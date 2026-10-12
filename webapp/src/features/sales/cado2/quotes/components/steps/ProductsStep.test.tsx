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
import type { JSX } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { AdapterDateFns, DatePickers } from "@wso2/oxygen-ui";
import {
  emptyDraftForm,
  type DraftFormValues,
  type LineValue,
} from "@features/sales/cado2/quotes/form/draftForm";
import ProductsStep from "./ProductsStep";

// D72: products brought in from the opportunity.

const empty = {
  data: [],
  error: null,
  isPending: false,
  isFetching: false,
  refetch: vi.fn(),
};
vi.mock("@features/sales/cado2/quotes/api/useQuoteApi", () => ({
  useAccountOpportunities: () => empty,
  useCurrencies: () => ({ ...empty, data: ["USD"] }),
  usePricebooks: () => empty,
  useProducts: () => ({
    ...empty,
    data: { pages: [] },
    hasNextPage: false,
    fetchNextPage: vi.fn(),
  }),
}));

const line = (name: string, category: LineValue["category"]): LineValue => ({
  lineId: null,
  pricebookEntryId: `01u${name}`,
  productName: name,
  productCode: "",
  productDescription: "",
  pricebookId: "01sUSD",
  pricebookName: "USD Price Book",
  unitPrice: "360",
  category,
  categorySource: category ? "MAPPED" : "REP",
  unitOfMeasure: "",
  quantity: "1",
  discount: "",
});

function Harness(): JSX.Element {
  const form = useForm<DraftFormValues>({
    defaultValues: {
      ...emptyDraftForm(),
      accountId: "001A",
      currencyIsoCode: "USD",
      defaultPricebookId: "01sUSD",
      defaultPricebookName: "USD Price Book",
      startDate: "2027-01-01",
      dealKind: "FIRST_SALE",
      lines: [
        line("WSO2 Gateway", "SUBSCRIPTION"),
        line("WSO2 Integrator", ""),
      ],
      notBroughtIn: [
        {
          productName: "WSO2 Legacy",
          reason: "not active in USD Price Book in USD",
        },
      ],
    },
  });
  return (
    <DatePickers.LocalizationProvider dateAdapter={AdapterDateFns}>
      <FormProvider {...form}>
        <ProductsStep preview={null} />
      </FormProvider>
    </DatePickers.LocalizationProvider>
  );
}

describe("ProductsStep (Term & Products)", () => {
  it("puts the term first, and says what wasn't brought in", () => {
    render(<Harness />);
    const regions = screen
      .getAllByRole("region")
      .map((r) => r.getAttribute("aria-label"));
    expect(regions.indexOf("Term")).toBeLessThan(regions.indexOf("Products"));
    expect(
      screen.getByText("WSO2 Legacy: not active in USD Price Book in USD"),
    ).toBeInTheDocument();
  });

  it("shows every line with its category, and a choice on the line when the product isn't mapped", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const table = screen.getByRole("table", { name: "Products" });

    const gateway = within(table)
      .getByText("WSO2 Gateway")
      .closest("tr") as HTMLElement;
    expect(within(gateway).getByText("Subscription")).toBeInTheDocument(); // mapped: shown, not chosen
    expect(within(gateway).queryByRole("combobox")).toBeNull();
    expect(within(table).queryByText("Category to choose")).toBeNull(); // no heading strip (2026-10-12)

    await user.click(
      within(table).getByRole("combobox", {
        name: "Category of WSO2 Integrator",
      }),
    );
    await user.click(screen.getByRole("option", { name: "Support" }));

    const integrator = within(table)
      .getByText("WSO2 Integrator")
      .closest("tr") as HTMLElement;
    expect(
      within(integrator).getByRole("combobox", {
        name: "Category of WSO2 Integrator",
      }),
    ).toHaveTextContent("Support");
  });
});
