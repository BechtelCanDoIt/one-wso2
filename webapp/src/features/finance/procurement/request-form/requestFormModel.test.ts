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
import type { Person } from "../types";
import {
  attachmentProblem,
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

const me: Person = { id: "u-1", name: "Req Uester", email: "requester@example.com" };
const lead: Person = { id: "u-2", name: "Team Lead", email: "lead@example.com" };

const completeIt = (): RequestDraft => {
  const draft = emptyDraft(lead);
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
    budgetApproverEmails: ["budget.owner@example.com"],
  };
};

describe("step 1, the team lead", () => {
  it("is required", () => {
    expect(missingForStep(STEP_REQUESTER, emptyDraft(null), me)).toEqual(["Team lead"]);
  });

  it("cannot be the requester, by id or by email in any case", () => {
    expect(missingForStep(STEP_REQUESTER, emptyDraft(me), me)).toHaveLength(1);
    expect(
      missingForStep(STEP_REQUESTER, emptyDraft({ ...me, id: "other", email: "Requester@WSO2.com" }), me),
    ).toHaveLength(1);
  });

  it("is satisfied by someone else", () => {
    expect(missingForStep(STEP_REQUESTER, emptyDraft(lead), me)).toEqual([]);
  });
});

describe("step 2 and 3", () => {
  it("need a category before anything else is asked", () => {
    expect(missingForStep(STEP_CATEGORY, emptyDraft(lead), me)).toEqual(["Procurement category"]);
    expect(missingForStep(STEP_DETAILS, emptyDraft(lead), me)).toEqual(["Procurement category"]);
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
    const draft: RequestDraft = { ...emptyDraft(lead), category: "NON-IT" };
    expect(missingForStep(STEP_DETAILS, draft, me)).toEqual(["Details of goods / services", "Business justification"]);
  });
});

describe("step 4, budget", () => {
  it("is optional for IT apart from a budget approver", () => {
    const draft = { ...completeIt(), budgetApproverEmails: [""] };
    expect(missingForStep(STEP_BUDGET, draft, me)).toEqual(["Budget approver"]);
    expect(missingForStep(STEP_BUDGET, completeIt(), me)).toEqual([]);
  });

  it("is required for Non-IT", () => {
    const draft: RequestDraft = { ...emptyDraft(lead), category: "NON-IT", budgetApproverEmails: ["a@example.com"] };
    expect(missingForStep(STEP_BUDGET, draft, me)).toEqual([
      "Budget category",
      "Business unit",
      "Product",
      "Region",
      "Engagement code",
    ]);
  });
});

describe("incompleteSteps", () => {
  it("is empty for a finished request and lists steps in order otherwise", () => {
    expect(incompleteSteps(completeIt(), me)).toEqual([]);
    expect(incompleteSteps(emptyDraft(null), me).map((s) => s.step)).toEqual([1, 2, 3, 4]);
  });
});

describe("draftToInput", () => {
  it("sends the team lead by id and never the requester, status or dates", () => {
    const input = draftToInput({ ...completeIt(), declarationAccepted: true });
    expect(input.teamLeadId).toBe("u-2");
    expect(Object.keys(input)).not.toEqual(expect.arrayContaining(["requester", "status", "submittedAt"]));
    expect(input.budgetApprovers).toEqual([{ email: "budget.owner@example.com" }]);
  });

  it("drops blank vendors and integrations, and integrations when there are none", () => {
    const draft = { ...completeIt(), vendors: [{ name: "", website: "", contact: "", email: "", phone: "" }] };
    const input = draftToInput(draft);
    expect(input.vendors).toEqual([]);
    expect(input.details.integrations).toEqual([]);
  });

  it("refuses an incomplete draft", () => {
    expect(() => draftToInput(emptyDraft(null))).toThrow();
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
