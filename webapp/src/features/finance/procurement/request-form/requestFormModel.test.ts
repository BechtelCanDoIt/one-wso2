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

import { describe, expect, it } from "vitest";
import type { Person, ProcurementLookups, ProcurementMe, PurchaseRequest } from "../types";
import {
  attachmentProblem,
  budgetForDisplay,
  draftFromRequest,
  draftToInput,
  emptyDraft,
  incompleteSteps,
  missingForStep,
  STEP_BUDGET,
  STEP_CATEGORY,
  STEP_DETAILS,
  STEP_REQUESTER,
  type RequestDraft,
} from "./requestFormModel";

const lead: Person = { id: "lead@example.com", name: "Team Lead", email: "lead@example.com" };
const other: Person = { id: "other@example.com", name: "Other Approver", email: "other@example.com" };
const me: ProcurementMe = {
  id: "requester@example.com",
  name: "Req Uester",
  email: "requester@example.com",
  roles: [],
  teamLead: lead,
  approvalExempt: false,
};
const noManager: ProcurementMe = { ...me, teamLead: null };

const completeIt = (): RequestDraft => {
  const draft = emptyDraft();
  return {
    ...draft,
    category: "IT",
    details: {
      ...draft.details,
      product: "Figma",
      plan: "Org",
      description: "Design tool",
      usagePeriod: "1 year",
      businessJustification: "Needed",
      sensitiveData: "no",
      externalPii: "no",
      employeePii: "no",
      integrates: "no",
    },
  };
};

describe("step 1, who approves", () => {
  it("is settled by a manager on record, with no additional approver needed", () => {
    expect(missingForStep(STEP_REQUESTER, emptyDraft(), me)).toEqual([]);
  });

  it("needs an additional approver when there is no manager, who then becomes the team lead", () => {
    expect(missingForStep(STEP_REQUESTER, emptyDraft(), noManager)).toEqual(["a team lead or an additional approver"]);
    expect(missingForStep(STEP_REQUESTER, { ...emptyDraft(), additionalApprovers: [other] }, noManager)).toEqual([]);
  });

  it("needs nobody for a requester whose requests need no approval", () => {
    expect(missingForStep(STEP_REQUESTER, emptyDraft(), { ...noManager, approvalExempt: true })).toEqual([]);
  });

  it("refuses the requester or the team lead as an additional approver, by id or by email in any case", () => {
    const refused = ["additional approvers other than yourself and your team lead"];
    expect(missingForStep(STEP_REQUESTER, { ...emptyDraft(), additionalApprovers: [me] }, me)).toEqual(refused);
    expect(missingForStep(STEP_REQUESTER, { ...emptyDraft(), additionalApprovers: [lead] }, me)).toEqual(refused);
    expect(
      missingForStep(STEP_REQUESTER, { ...emptyDraft(), additionalApprovers: [{ ...lead, id: "x", email: "LEAD@example.com" }] }, me),
    ).toEqual(refused);
  });
});

describe("step 2 and 3", () => {
  it("need a category before anything else is asked", () => {
    expect(missingForStep(STEP_CATEGORY, emptyDraft(), me)).toEqual(["Procurement category"]);
    expect(missingForStep(STEP_DETAILS, emptyDraft(), me)).toEqual(["Procurement category"]);
  });

  it("ask an IT request for its security assessment", () => {
    const draft: RequestDraft = { ...completeIt(), details: { ...completeIt().details, sensitiveData: "", integrates: "" } };
    expect(missingForStep(STEP_DETAILS, draft, me)).toEqual(["Sensitive data answer", "Integration answer"]);
  });

  it("ask for detail only after a Yes", () => {
    const base = completeIt();
    const yes = { ...base, details: { ...base.details, sensitiveData: "yes" as const, integrates: "yes" as const } };
    expect(missingForStep(STEP_DETAILS, yes, me)).toEqual([
      "Sensitive data details",
      "Integration systems",
      "Vendor documentation answer",
    ]);
  });

  it("ask a Non-IT request only for what and why", () => {
    const draft: RequestDraft = { ...emptyDraft(), category: "NON-IT" };
    expect(missingForStep(STEP_DETAILS, draft, me)).toEqual(["Details of goods / services", "Business justification"]);
  });
});

describe("step 4, budget", () => {
  it("is optional for IT, the budget approver included", () => {
    expect(missingForStep(STEP_BUDGET, completeIt(), me)).toEqual([]);
  });

  it("is required for Non-IT, with a budget approver", () => {
    const draft: RequestDraft = { ...emptyDraft(), category: "NON-IT" };
    expect(missingForStep(STEP_BUDGET, draft, me)).toEqual([
      "Budget category",
      "Business unit",
      "Product",
      "Region",
      "Engagement code",
      "Budget approver",
    ]);
  });
});

describe("incompleteSteps", () => {
  it("is empty for a finished request and lists steps in order otherwise", () => {
    expect(incompleteSteps(completeIt(), me)).toEqual([]);
    expect(incompleteSteps(emptyDraft(), noManager).map((s) => s.step)).toEqual([1, 2, 3]);
  });
});

describe("draftToInput", () => {
  it("sends the additional approvers' emails and the approver id, never the requester, team lead, status or dates", () => {
    const input = draftToInput({ ...completeIt(), additionalApprovers: [other], budgetApproverId: "10", declarationAccepted: true });
    expect(input.additionalApprovers).toEqual(["other@example.com"]);
    expect(input.budgetApproverId).toBe("10");
    expect(Object.keys(input)).not.toEqual(expect.arrayContaining(["requester", "teamLead", "status", "submittedAt"]));
  });

  it("drops blank vendors and integrations, and integrations when there are none", () => {
    const draft = { ...completeIt(), vendors: [{ name: "", website: "", contact: "", email: "", phone: "" }] };
    const input = draftToInput(draft);
    expect(input.vendors).toEqual([]);
    expect(input.details.integrations).toEqual([]);
  });

  it("refuses an incomplete draft", () => {
    expect(() => draftToInput(emptyDraft())).toThrow();
  });
});

describe("draftFromRequest", () => {
  const request = {
    category: "IT",
    additionalApprovers: ["other@example.com"],
    details: completeIt().details,
    vendors: [],
    budget: { category: "CAT-1", businessUnit: "BU-1", product: "", region: "", engagementCode: "", salesforceCampaign: "" },
    budgetApproverId: "10",
    notes: "",
  } as unknown as PurchaseRequest;

  it("reopens the saved request with the declaration to be made again", () => {
    const draft = draftFromRequest(request);
    expect(draft.additionalApprovers.map((a) => a.email)).toEqual(["other@example.com"]);
    expect(draft.budgetApproverId).toBe("10");
    expect(draft.declarationAccepted).toBe(false);
  });

  it("leaves the category empty for a Marketing & Events request, which cannot be edited here", () => {
    expect(draftFromRequest({ ...request, category: "EVENTS" }).category).toBe("");
  });
});

describe("budgetForDisplay", () => {
  const lookups: ProcurementLookups = {
    budgetCategories: [{ value: "CAT-1", label: "Software" }],
    businessUnits: [{ value: "BU-1", label: "Sales" }],
    products: [],
    regions: [],
  };

  it("replaces each code by its label and leaves an unlisted code as it is", () => {
    const shown = budgetForDisplay(
      { category: "CAT-1", businessUnit: "BU-1", product: "PRD-9", region: "", engagementCode: "ENG-1", salesforceCampaign: "Q4" },
      lookups,
      [{ value: "ENG-1", label: "ENG-1 - Platform" }],
    );
    expect(shown).toEqual({ category: "Software", businessUnit: "Sales", product: "PRD-9", region: "", engagementCode: "ENG-1 - Platform", salesforceCampaign: "Q4" });
  });
});

describe("attachmentProblem", () => {
  it("accepts a document within the limit", () => {
    expect(attachmentProblem({ name: "quote.PDF", size: 1024 })).toBeNull();
  });

  it("refuses other types, empty files and oversized files", () => {
    expect(attachmentProblem({ name: "run.exe", size: 10 })).toMatch(/not a supported/);
    expect(attachmentProblem({ name: "notes", size: 10 })).toMatch(/not a supported/);
    expect(attachmentProblem({ name: "a.pdf", size: 0 })).toMatch(/empty/);
    expect(attachmentProblem({ name: "a.pdf", size: 11 * 1024 * 1024 })).toMatch(/10 MB/);
  });
});
