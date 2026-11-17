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
import type { Person } from "../types";
import { emptyBudget, emptyDetails, emptyVendor } from "../request-form/requestFormModel";
import RequestSummary, { type RequestView } from "./RequestSummary";

const requester: Person = { id: "u-1", name: "Emery Quinn", email: "emery.quinn@example.com" };
const lead: Person = { id: "u-2", name: "Jordan Ellis", email: "jordan.ellis@example.com" };

const view = (patch: Partial<RequestView> = {}): RequestView => ({
  category: "IT",
  requester,
  teamLead: lead,
  details: { ...emptyDetails(), product: "ZoomInfo", plan: "Enterprise", description: "Data", usagePeriod: "1 year", businessJustification: "Needed", sensitiveData: "no", externalPii: "no", employeePii: "no", integrates: "no" },
  vendors: [{ ...emptyVendor(), name: "ZoomInfo" }],
  budget: emptyBudget(),
  additionalApprovers: [],
  budgetApprover: "Budget Owner",
  notes: "",
  ...patch,
});

describe("RequestSummary", () => {
  it("has one card per form step and puts the key facts up front", () => {
    render(<RequestSummary view={view({ date: { label: "Raised", iso: "2026-11-06T00:00:00.000Z" } })} />);
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual([
      "Requester",
      "Requirement details",
      "Vendors",
      "Budget",
      "Notes",
    ]);
    expect(screen.getByText("IT request")).toBeInTheDocument();
    expect(screen.getByText("Team lead: Jordan Ellis")).toBeInTheDocument();
    expect(screen.getByText(/^Raised /)).toBeInTheDocument();
  });

  it("shows the team lead and any additional approvers, and Not provided when there is no team lead", () => {
    const { rerender } = render(<RequestSummary view={view({ additionalApprovers: ["other@example.com", "third@example.com"] })} />);
    expect(screen.getByText("Jordan Ellis, jordan.ellis@example.com")).toBeInTheDocument();
    expect(screen.getByText(/other@example.com/)).toBeInTheDocument();
    rerender(<RequestSummary view={view({ teamLead: null })} />);
    expect(screen.queryByText("Jordan Ellis, jordan.ellis@example.com")).toBeNull();
  });

  it("names a Marketing & Events request, which it only reads", () => {
    render(<RequestSummary view={view({ category: "EVENTS" })} />);
    expect(screen.getByText("Marketing & Events request")).toBeInTheDocument();
    expect(screen.getByText("Marketing & Events Procurement")).toBeInTheDocument();
  });

  it("says Not provided for a skipped optional field and leaves out a required one that is empty", () => {
    render(<RequestSummary view={view()} />);
    expect(screen.getAllByText("Not provided").length).toBeGreaterThan(0);
    expect(screen.getByText("Engagement code")).toBeInTheDocument();
    expect(screen.getByText("Notes for Procurement")).toBeInTheDocument();
  });

  it("treats budget details as required for Non-IT, so a blank one is not offered as skipped", () => {
    render(<RequestSummary view={view({ category: "NON-IT", details: { ...emptyDetails(), description: "Chairs", businessJustification: "Worn out" } })} />);
    expect(screen.queryByText("Engagement code")).toBeNull();
    expect(screen.getByText("Additional specifications or document links")).toBeInTheDocument();
  });

  it("cuts long text with Show more, and short text is left alone", async () => {
    const user = userEvent.setup();
    const long = "A long justification. ".repeat(20);
    render(<RequestSummary view={view({ details: { ...view().details, businessJustification: long } })} />);
    const more = screen.getByRole("button", { name: "Show more" });
    expect(screen.getAllByRole("button", { name: "Show more" })).toHaveLength(1);
    await user.click(more);
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });

  it("offers Edit on each card only when asked to, naming the step that holds it", async () => {
    const onEditStep = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<RequestSummary view={view()} />);
    expect(screen.queryByRole("button", { name: /^Edit/ })).toBeNull();
    rerender(<RequestSummary view={view()} onEditStep={onEditStep} />);
    await user.click(screen.getByRole("button", { name: "Edit Requester" }));
    await user.click(screen.getByRole("button", { name: "Edit Budget" }));
    expect(onEditStep.mock.calls).toEqual([[1], [4]]);
    expect(within(screen.getByRole("button", { name: "Edit Requirement details" })).getByText("Edit")).toBeInTheDocument();
  });
});
