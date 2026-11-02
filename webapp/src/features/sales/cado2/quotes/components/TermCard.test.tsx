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
import { FormProvider, useForm } from "react-hook-form";
import { DatePickers } from "@wso2/oxygen-ui";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { emptyDraftForm, type DraftFormValues } from "@features/sales/cado2/quotes/form/draftForm";
import TermCard from "./TermCard";

vi.mock("@features/sales/cado2/quotes/api/useQuoteApi", () => ({
  useAccountOpportunities: () => ({ data: [], isPending: false, isFetching: false, error: null }),
}));

function Harness({ values }: { values: Partial<DraftFormValues> }) {
  const form = useForm<DraftFormValues>({ defaultValues: { ...emptyDraftForm(), ...values } });
  return (
    <DatePickers.LocalizationProvider dateAdapter={AdapterDateFns}>
      <FormProvider {...form}>
        <TermCard />
      </FormProvider>
    </DatePickers.LocalizationProvider>
  );
}

// The value shown under an information label (the card's title is "Term" too).
const info = (label: string) => screen.getAllByText(label).at(-1)?.nextSibling;

// The end date, read-only, follows the years in the Products table; no
// hints that go stale.
describe("TermCard", () => {
  it("shows the end the years lead to, and its length", () => {
    render(<Harness values={{ startDate: "2027-02-01", yearCount: 2 }} />);
    expect(info("Ends")).toHaveTextContent("31 Jan 2029");
    expect(info("Term")).toHaveTextContent("2 years");
    expect(screen.queryByRole("textbox", { name: "End date" })).toBeNull();
    // Where the end comes from, on hover.
    expect(screen.getByLabelText(/^One year from the start to begin with/)).toBeInTheDocument();
    expect(screen.queryByText(/From the opportunity, or choose it/)).toBeNull();
    expect(screen.queryByText(/Each year runs 12 months/)).toBeNull();
  });

  it("gives the length of a term with a shortened last year, and what approval it needs", () => {
    render(<Harness values={{ startDate: "2027-02-01", yearCount: 4, lastYearEndDate: "2030-07-31" }} />);
    expect(info("Ends")).toHaveTextContent("31 Jul 2030");
    expect(info("Term")).toHaveTextContent("3 years + 6 months");
    expect(screen.getByText("Over 3 years: needs extended-term approval")).toBeInTheDocument();
  });

  it("has no end without years", () => {
    render(<Harness values={{ startDate: "2027-02-01", yearCount: 0 }} />);
    expect(info("Ends")).toHaveTextContent("—");
  });
});
