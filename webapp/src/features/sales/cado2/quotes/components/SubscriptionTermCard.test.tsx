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
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { AdapterDateFns, DatePickers } from "@wso2/oxygen-ui";
import {
  emptyDraftForm,
  type DraftFormValues,
  type LineValue,
} from "@features/sales/cado2/quotes/form/draftForm";
import SubscriptionTermCard from "./SubscriptionTermCard";

// D73: the Term card on Term & Products.

const won = [
  {
    id: "006W",
    name: "APIM Subs 2026",
    subsStartDate: "2026-02-01",
    subsEndDate: "2027-01-31",
  },
  {
    id: "006C",
    name: "IS Subs 2027",
    subsStartDate: "2026-07-01",
    subsEndDate: "2027-06-30",
  },
];
vi.mock("@features/sales/cado2/quotes/api/useQuoteApi", () => ({
  useAccountOpportunities: () => ({
    data: won,
    error: null,
    isPending: false,
    isFetching: false,
  }),
}));

const line: LineValue = {
  lineId: null,
  pricebookEntryId: "01uGW",
  productName: "WSO2 Gateway",
  productCode: "GW",
  productDescription: "",
  pricebookId: "01sUSD",
  pricebookName: "USD",
  unitPrice: "360",
  category: "SUBSCRIPTION",
  categorySource: "MAPPED",
  recurring: true,
  unitOfMeasure: "",
  quantity: "1",
  discount: "",
};

/** What the form holds for the term. */
function Held(): JSX.Element {
  const [mode, end, coTerm] = useWatch<
    DraftFormValues,
    ["termMode", "termEndDate", "coTermOpportunityId"]
  >({
    name: ["termMode", "termEndDate", "coTermOpportunityId"],
  });
  return (
    <output aria-label="Held">{`${mode || "none"} · ${end || "no end"} · ${coTerm || "no co-term"}`}</output>
  );
}

function Harness({
  values,
}: {
  values: Partial<DraftFormValues>;
}): JSX.Element {
  const form = useForm<DraftFormValues>({
    defaultValues: {
      ...emptyDraftForm(),
      accountId: "001A",
      termMode: "",
      lines: [line],
      ...values,
    },
  });
  return (
    <DatePickers.LocalizationProvider dateAdapter={AdapterDateFns}>
      <FormProvider {...form}>
        <SubscriptionTermCard />
        <Held />
      </FormProvider>
    </DatePickers.LocalizationProvider>
  );
}

describe("Term card", () => {
  it("locks a renewal's start: the day after the renewed opportunity ends", () => {
    render(
      <Harness
        values={{
          isRenewal: true,
          dealKind: "RENEWAL",
          previousOpportunityIds: ["006W"],
          startDate: "2027-02-01",
        }}
      />,
    );
    expect(screen.getByLabelText("Locked")).toBeInTheDocument();
    expect(
      screen.getByText("The day after APIM Subs 2026 ends, in Salesforce"),
    ).toBeInTheDocument();
  });

  it("lets a fresh sale or an expansion choose its start", () => {
    render(
      <Harness values={{ dealKind: "FIRST_SALE", startDate: "2027-02-01" }} />,
    );
    expect(screen.queryByLabelText("Locked")).toBeNull();
  });

  it("co-terminates an expansion with the opportunity it ends with", async () => {
    const user = userEvent.setup();
    render(
      <Harness values={{ dealKind: "EXPANSION", startDate: "2027-01-01" }} />,
    );

    await user.click(screen.getByRole("radio", { name: "Less than a year" }));
    expect(screen.getByLabelText("Held")).toHaveTextContent("none"); // the question comes first
    await user.click(screen.getByRole("radio", { name: "Yes" }));
    await user.click(
      screen.getByRole("combobox", { name: "Co-terminates with" }),
    );
    // Contracts running past the start, ending soonest first.
    await user.click(screen.getByRole("option", { name: /IS Subs 2027/ }));

    expect(screen.getByLabelText("Held")).toHaveTextContent(
      "CO_TERMED · 2027-06-30 · 006C",
    );
    expect(screen.getByText("Ends 30 Jun 2027, with it")).toBeInTheDocument();
  });

  it("makes an expansion that isn't co-terminated a short term, with its own end date", async () => {
    const user = userEvent.setup();
    render(
      <Harness values={{ dealKind: "EXPANSION", startDate: "2027-01-01" }} />,
    );
    await user.click(screen.getByRole("radio", { name: "Less than a year" }));
    await user.click(screen.getByRole("radio", { name: "No" }));
    expect(screen.getByLabelText("Held")).toHaveTextContent("SHORTER");
    expect(screen.getByRole("group", { name: "End date" })).toBeInTheDocument();
  });

  it("never co-terminates a renewal or a fresh sale: under a year is a short term needing approval", async () => {
    const user = userEvent.setup();
    render(
      <Harness values={{ dealKind: "FIRST_SALE", startDate: "2027-01-01" }} />,
    );
    await user.click(screen.getByRole("radio", { name: "Less than a year" }));
    expect(screen.queryByRole("radio", { name: "Yes" })).toBeNull();
    expect(screen.getByLabelText("Held")).toHaveTextContent("SHORTER");
    expect(
      screen.getByText("A term under a year needs approval."),
    ).toBeInTheDocument();
  });

  it("says why there's no duration yet when nothing is added", () => {
    render(<Harness values={{ dealKind: "FIRST_SALE", lines: [] }} />);
    expect(
      screen.getByText("The duration is asked once a recurring product (charged every year) is added below."),
    ).toBeInTheDocument();
  });

  it("asks the duration for a recurring product even without a category (D76)", () => {
    render(<Harness values={{ dealKind: "FIRST_SALE", lines: [{ ...line, category: "" }] }} />);
    expect(screen.getByRole("radiogroup", { name: "Duration" })).toBeInTheDocument();
  });

  it("has no duration when no product recurs, whatever its category (D76)", () => {
    render(
      <Harness
        values={{
          dealKind: "FIRST_SALE",
          lines: [{ ...line, category: "SUBSCRIPTION", recurring: false }],
        }}
      />,
    );
    expect(screen.queryByRole("radiogroup", { name: "Duration" })).toBeNull();
    expect(
      screen.getByText("No recurring products: no subscription term. Only the contract total (TCV) applies."),
    ).toBeInTheDocument();
  });
});
