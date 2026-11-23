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

const { directorySearch } = vi.hoisted(() => ({ directorySearch: vi.fn() }));

// Everything the form asks the backend for, answered the way the backend would.
vi.mock("../api/useProcurement", () => {
  const settled = { isFetching: false, isError: false, error: null };
  return {
    // Everyone the search might return, including the requester and the team lead.
    useDirectorySearch: (query: string, leadsOnly: boolean) => {
      directorySearch(query, leadsOnly);
      return {
        ...settled,
        data: [
          { id: "other@example.com", name: "Other Approver", email: "other@example.com" },
          { id: "lead@example.com", name: "Team Lead", email: "lead@example.com" },
          { id: "requester@example.com", name: "Req Uester", email: "requester@example.com" },
        ],
      };
    },
    useEngagementCodes: (unitName: string) => ({ ...settled, data: unitName ? [{ value: "ENG-1", label: "ENG-1 - Platform" }] : [] }),
    useBudgetApprovers: ({ businessUnit, region }: { businessUnit: string; region: string }) => ({
      ...settled,
      data: businessUnit || region ? [{ id: "10", name: "Budget Owner" }] : [],
    }),
  };
});

const lead: Person = { id: "lead@example.com", name: "Team Lead", email: "lead@example.com" };
const me: ProcurementMe = { id: "requester@example.com", name: "Req Uester", email: "requester@example.com", roles: [], teamLead: lead, approvalExempt: false };
const lookups: ProcurementLookups = {
  budgetCategories: [{ value: "CAT-1", label: "Facilities & Office" }],
  businessUnits: [
    { value: "BU-1", label: "Sales" },
    { value: "BU-2", label: "Legal" },
  ],
  products: [{ value: "PRD-1", label: "Choreo" }],
  regions: [{ value: "REG-1", label: "Global" }],
};

function renderForm(user: ProcurementMe = me, initialDraft: RequestDraft = emptyDraft()) {
  const onSubmit = vi.fn();
  render(<RequestForm initialDraft={initialDraft} me={user} lookups={lookups} submitLabel="Submit request" submitting={false} onSubmit={onSubmit} />);
  return { onSubmit, user: userEvent.setup() };
}

const nonIt = (): RequestDraft => {
  const draft = emptyDraft();
  return { ...draft, category: "NON-IT", details: { ...draft.details, description: "Chairs", businessJustification: "Worn out" } };
};

describe("RequestForm, the requester step", () => {
  it("shows the backend's team lead read-only and the sign-in identity locked", () => {
    renderForm();
    expect(screen.getByLabelText("WSO2 email")).toBeDisabled();
    expect(screen.getByLabelText("Your full name")).toHaveValue("Req Uester");
    const teamLead = screen.getByLabelText(/Team lead \(for approval\)/);
    expect(teamLead).toBeDisabled();
    expect(teamLead).toHaveValue("Team Lead (lead@example.com)");
  });

  it("moves on with the manager as team lead and no additional approver", async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Procurement category" })).toBeInTheDocument();
  });

  it("keeps additional approvers out of sight until the requester asks, and folds them away again", async () => {
    const { user } = renderForm();
    expect(screen.queryByLabelText(/Additional approvers/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Add an additional approver" }));
    expect(screen.queryByRole("button", { name: "Add an additional approver" })).toBeNull();
    await user.type(screen.getByLabelText(/Additional approvers/), "oth");
    await user.click(await screen.findByRole("option", { name: "Other Approver (other@example.com)" }));
    expect(screen.getByText("Other Approver (other@example.com)")).toBeInTheDocument();

    await user.click(screen.getByTestId("CancelIcon"));
    expect(screen.queryByLabelText(/Additional approvers/)).toBeNull();
    expect(screen.getByRole("button", { name: "Add an additional approver" })).toBeInTheDocument();
  });

  it("opens no list, and says nothing, until three characters are typed", async () => {
    const { user } = renderForm({ ...me, teamLead: null });
    const field = screen.getByLabelText(/Additional approvers/);
    await user.click(field);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByText(/at least 3 characters/i)).toBeNull();
    await user.type(field, "ot");
    expect(screen.queryByRole("listbox")).toBeNull();
    await user.type(field, "h");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });

  it("searches for leads only, because only leads can approve", async () => {
    directorySearch.mockClear();
    const { user } = renderForm({ ...me, teamLead: null });
    await user.type(screen.getByLabelText(/Additional approvers/), "oth");
    expect(directorySearch).toHaveBeenCalled();
    expect(directorySearch.mock.calls.every(([, leadsOnly]) => leadsOnly === true)).toBe(true);
  });

  it("shows the field at once, as required, when there is no manager", () => {
    renderForm({ ...me, teamLead: null });
    expect(screen.getByLabelText(/Additional approvers/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add an additional approver" })).toBeNull();
  });

  it("needs an additional approver when there is no manager, and accepts one picked from the directory", async () => {
    const { user } = renderForm({ ...me, teamLead: null });
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/Please complete: a team lead or an additional approver/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Additional approvers/), "oth");
    await user.click(await screen.findByRole("option", { name: "Other Approver (other@example.com)" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Procurement category" })).toBeInTheDocument();
  });

  it("does not let the requester or the team lead be picked as an additional approver", async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole("button", { name: "Add an additional approver" }));
    await user.type(screen.getByLabelText(/Additional approvers/), "oth");
    expect(await screen.findByRole("option", { name: "Other Approver (other@example.com)" })).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("option", { name: "Team Lead (lead@example.com)" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("option", { name: "Req Uester (requester@example.com)" })).toHaveAttribute("aria-disabled", "true");
  });
});

describe("RequestForm, the steps after it", () => {
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

  it("asks for users, administrators and the security assessment only when the IT software is SaaS", async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: /^IT Related Procurement/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByLabelText(/Number of users/)).toBeNull();
    expect(screen.queryByText(/Data & security assessment/)).toBeNull();

    await user.click(screen.getByRole("combobox", { name: /Installation type/ }));
    await user.click(await screen.findByRole("option", { name: /^SaaS/ }));
    expect(screen.getByLabelText(/Number of users/)).toBeInTheDocument();
    expect(screen.getByText(/Data & security assessment/)).toBeInTheDocument();
  });

  it("marks both IT confirmations as required", async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: /^IT Related Procurement/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("checkbox", { name: /authorised software list/ })).toBeRequired();
    expect(screen.getByRole("checkbox", { name: /vendor and the software are legitimate/ })).toBeRequired();
  });

  it("offers Marketing & Events as coming soon, not as a choice", async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Marketing/ })).toBeNull();
  });

  it("asks for the engagement code and budget approver only after a business unit, and clears them when it changes", async () => {
    const { user } = renderForm(me, nonIt());
    for (let i = 0; i < 3; i += 1) await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByRole("heading", { name: "Vendor & budget" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Engagement code/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("combobox", { name: /Budget approver/ })).toHaveAttribute("aria-disabled", "true");

    const pick = async (field: RegExp, option: string) => {
      await user.click(screen.getByRole("combobox", { name: field }));
      await user.click(await screen.findByRole("option", { name: option }));
    };
    await pick(/Business unit/, "Sales");
    await pick(/Engagement code/, "ENG-1 - Platform");
    await pick(/Budget approver/, "Budget Owner");
    expect(screen.getByRole("combobox", { name: /Engagement code/ })).toHaveTextContent("ENG-1 - Platform");
    expect(screen.getByRole("combobox", { name: /Budget approver/ })).toHaveTextContent("Budget Owner");

    await pick(/Business unit/, "Legal");
    expect(screen.getByRole("combobox", { name: /Engagement code/ })).toHaveTextContent("Select");
    expect(screen.getByRole("combobox", { name: /Budget approver/ })).toHaveTextContent("Select");
  });

  it("on the review page keeps Submit enabled, asks for the declaration, then submits once it is ticked", async () => {
    const complete: RequestDraft = {
      ...nonIt(),
      budget: { category: "CAT-1", businessUnit: "BU-1", product: "PRD-1", region: "REG-1", engagementCode: "ENG-1", salesforceCampaign: "" },
      budgetApproverId: "10",
    };
    const { user, onSubmit } = renderForm(me, complete);
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole("button", { name: /Continue|Next: review/ }));
    expect(screen.getByRole("heading", { name: "Review & submit" })).toBeInTheDocument();
    expect(screen.getByText("Budget Owner")).toBeInTheDocument();
    expect(screen.getByText("ENG-1 - Platform")).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Submit request" });
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(screen.getByRole("alert")).toHaveTextContent("Tick the declaration to submit.");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox"));
    expect(screen.queryByText("Tick the declaration to submit.")).toBeNull();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ budgetApproverId: "10", additionalApprovers: [] });
  });
});
