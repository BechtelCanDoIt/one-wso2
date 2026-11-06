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
import userEvent from "@testing-library/user-event";
import type { Person, ProcurementLookups, ProcurementMe } from "../types";
import RequestForm from "./RequestForm";
import { emptyDraft, type RequestDraft } from "./requestFormModel";

// The directory picker is the only part that reaches for the backend.
vi.mock("../api/useProcurement", () => ({
  useDirectorySearch: () => ({ data: [], isFetching: false, isError: false, error: null }),
}));

const lead: Person = { id: "u-2", name: "Team Lead", email: "lead@example.com" };
const me: ProcurementMe = { id: "u-1", name: "Req Uester", email: "requester@example.com", reportingLead: lead };
const lookups: ProcurementLookups = {
  itCategories: ["Software / SaaS"],
  usagePeriods: ["1 year"],
  budgetCategories: [],
  businessUnits: [],
  products: [],
  regions: [],
  engagementCodes: [],
  budgetApprovers: [],
};

function renderForm(reportingLead: Person | null = lead) {
  const onSubmit = vi.fn();
  render(
    <RequestForm
      initialDraft={emptyDraft(reportingLead)}
      me={me}
      lookups={lookups}
      submitLabel="Submit request"
      submitting={false}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe("RequestForm", () => {
  it("starts on the requester step with the reporting lead as team lead and the sign-in identity locked", () => {
    renderForm();
    expect(screen.getByLabelText("WSO2 email")).toBeDisabled();
    expect(screen.getByLabelText("Your full name")).toHaveValue("Req Uester");
    expect(screen.getByLabelText(/Team lead \(for approval\)/)).toHaveValue("Team Lead (lead@example.com)");
  });

  it("will not leave the first step without a team lead", async () => {
    const { user } = renderForm(null);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/Please complete: Team lead/)).toBeInTheDocument();
    expect(screen.queryByText("Choose the category that best matches your request", { exact: false })).toBeNull();
  });

  it("will not move past the category step until one is chosen, then asks that category's questions", async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/Please complete: Procurement category/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^IT Related Procurement/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "IT requirement details" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/Please complete: Product \/ solution name/)).toBeInTheDocument();
  });

  it("offers Marketing & Events as coming soon, not as a choice", async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Marketing/ })).toBeNull();
  });

  it("on the review page keeps Submit enabled, asks for the declaration, then submits once it is ticked", async () => {
    const draft = emptyDraft(lead);
    const complete: RequestDraft = {
      ...draft,
      category: "NON-IT",
      details: { ...draft.details, description: "Chairs", businessJustification: "Worn out" },
      budget: { category: "Facilities & Office", businessUnit: "Facilities & Admin", product: "Not product-specific", region: "APAC - Sri Lanka", engagementCode: "ENG-1", salesforceCampaign: "" },
      budgetApproverEmails: ["budget.owner@example.com"],
    };
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <RequestForm initialDraft={complete} me={me} lookups={lookups} submitLabel="Submit request" submitting={false} onSubmit={onSubmit} />,
    );
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole("button", { name: /Continue|Next: review/ }));
    expect(screen.getByRole("heading", { name: "Review & submit" })).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Submit request" });
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(screen.getByRole("alert")).toHaveTextContent("Tick the declaration to submit.");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox"));
    expect(screen.queryByText("Tick the declaration to submit.")).toBeNull();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
