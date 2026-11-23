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
  budgetForDisplay,
  draftFromRequest,
  draftToInput,
  emptyDraft,
  emptyEvent,
  incompleteSteps,
  problemsForStep,
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

const fields = (step: number, draft: RequestDraft, user: ProcurementMe = me): string[] => problemsForStep(step, draft, user).map((p) => p.field);

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
      softwareRequirement: "Design and prototyping for the product team",
      usagePeriod: "1 year",
      businessJustification: "Needed",
      installationType: "PLUGIN",
      userCount: "25",
      userNames: ["Design team"],
      adminCount: "2",
      adminNames: ["IT"],
      externalInteraction: "no",
      sensitiveData: "no",
      externalPii: "no",
      employeePii: "no",
      integrates: "no",
    },
  };
};

describe("step 1, who approves", () => {
  it("is settled by a manager on record, with no additional approver needed", () => {
    expect(fields(STEP_REQUESTER, emptyDraft(), me)).toEqual([]);
  });

  it("needs an additional approver when there is no manager, who then becomes the team lead", () => {
    expect(fields(STEP_REQUESTER, emptyDraft(), noManager)).toEqual(["additionalApprovers"]);
    expect(fields(STEP_REQUESTER, { ...emptyDraft(), additionalApprovers: [other] }, noManager)).toEqual([]);
  });

  it("needs nobody for a requester whose requests need no approval", () => {
    expect(fields(STEP_REQUESTER, emptyDraft(), { ...noManager, approvalExempt: true })).toEqual([]);
  });

  it("refuses the requester or the team lead as an additional approver, by id or by email in any case", () => {
    const refused = ["additionalApprovers"];
    expect(fields(STEP_REQUESTER, { ...emptyDraft(), additionalApprovers: [me] }, me)).toEqual(refused);
    expect(fields(STEP_REQUESTER, { ...emptyDraft(), additionalApprovers: [lead] }, me)).toEqual(refused);
    expect(
      fields(STEP_REQUESTER, { ...emptyDraft(), additionalApprovers: [{ ...lead, id: "x", email: "LEAD@example.com" }] }, me),
    ).toEqual(refused);
  });
});

describe("step 2 and 3", () => {
  it("need a category before anything else is asked", () => {
    expect(fields(STEP_CATEGORY, emptyDraft(), me)).toEqual(["category"]);
    expect(fields(STEP_DETAILS, emptyDraft(), me)).toEqual(["category"]);
  });

  it("ask an IT request for its requirement, how it is installed and the usage period", () => {
    const draft: RequestDraft = {
      ...completeIt(),
      details: { ...completeIt().details, softwareRequirement: " ", installationType: "", usagePeriod: "" },
    };
    expect(fields(STEP_DETAILS, draft, me)).toEqual(["softwareRequirement", "installationType", "usagePeriod"]);
  });

  it("ask every IT request for the external interaction and the security assessment", () => {
    expect(fields(STEP_DETAILS, completeIt(), me)).toEqual([]);
    const draft: RequestDraft = { ...completeIt(), details: { ...completeIt().details, externalInteraction: "", sensitiveData: "", integrates: "" } };
    expect(fields(STEP_DETAILS, draft, me)).toEqual(["externalInteraction", "sensitiveData", "integrates"]);
  });

  it("ask for detail only after a Yes", () => {
    const base = completeIt();
    const yes = { ...base, details: { ...base.details, sensitiveData: "yes" as const, integrates: "yes" as const } };
    expect(fields(STEP_DETAILS, yes, me)).toEqual(["sensitiveDataDetail", "integrationSystem", "vendorDocs"]);
  });

  it("ask a Non-IT request only for what and why", () => {
    const draft: RequestDraft = { ...emptyDraft(), category: "NON-IT" };
    expect(fields(STEP_DETAILS, draft, me)).toEqual(["description", "businessJustification"]);
  });
});

describe("the user and administrator counts", () => {
  const withCounts = (userCount: string, adminCount: string): RequestDraft => {
    const draft = completeIt();
    return { ...draft, details: { ...draft.details, userCount, adminCount } };
  };

  it("are required, with the names", () => {
    expect(fields(STEP_DETAILS, withCounts("", ""), me)).toEqual(["userCount", "adminCount"]);
    const draft = completeIt();
    expect(fields(STEP_DETAILS, { ...draft, details: { ...draft.details, userNames: [], adminNames: [] } }, me)).toEqual(["userNames", "adminNames"]);
  });

  it("accept whole numbers the backend allows, zero included", () => {
    expect(fields(STEP_DETAILS, withCounts("0", "100000"), me)).toEqual([]);
    expect(fields(STEP_DETAILS, withCounts("25", "2"), me)).toEqual([]);
  });

  it.each([["-1"], ["1.5"], ["abc"], ["100001"], ["1e3x"]])("refuse %s", (bad) => {
    expect(fields(STEP_DETAILS, withCounts(bad, "2"), me)).toEqual(["userCount"]);
    expect(fields(STEP_DETAILS, withCounts("2", bad), me)).toEqual(["adminCount"]);
  });
});

describe("step 4, budget", () => {
  it("is optional for IT, the budget approver included", () => {
    expect(fields(STEP_BUDGET, completeIt(), me)).toEqual([]);
  });

  it("is required for Non-IT, with a budget approver", () => {
    const draft: RequestDraft = { ...emptyDraft(), category: "NON-IT" };
    expect(fields(STEP_BUDGET, draft, me)).toEqual(["budgetCategory", "businessUnit", "budgetProduct", "region", "engagementCode", "budgetApprover"]);
  });
});

describe("links", () => {
  const withDocs = (vendorDocsLink: string): RequestDraft => {
    const draft = completeIt();
    return { ...draft, details: { ...draft.details, integrates: "yes", integrations: [{ system: "Salesforce", data: "" }], vendorDocs: "yes", vendorDocsLink } };
  };

  it("take several documentation links, separated by commas or spaces, each starting with http or https", () => {
    expect(fields(STEP_DETAILS, withDocs("https://example.com/a, http://example.com/b https://example.com/c"), me)).toEqual([]);
    expect(fields(STEP_DETAILS, withDocs("https://example.com/a, example.com/b"), me)).toEqual(["vendorDocsLink"]);
    expect(fields(STEP_DETAILS, withDocs("ftp://example.com/a"), me)).toEqual(["vendorDocsLink"]);
  });

  it("need a vendor website, when given, that starts with http or https", () => {
    const draft = completeIt();
    const withSite = (website: string): RequestDraft => ({ ...draft, vendors: [{ name: "Acme", website, contact: "", email: "", phone: "" }] });
    expect(fields(STEP_BUDGET, withSite(""), me)).toEqual([]);
    expect(fields(STEP_BUDGET, withSite("https://www.acme.example.com"), me)).toEqual([]);
    expect(fields(STEP_BUDGET, withSite("www.acme.example.com"), me)).toEqual(["vendorWebsite.0"]);
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
    for (const key of ["requester", "teamLead", "status", "submittedAt"]) expect(input).not.toHaveProperty(key);
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
    event: emptyEvent(),
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

  it("reopens a Marketing & Events request with its event", () => {
    const event = { ...emptyEvent(), name: "KubeCon" };
    const draft = draftFromRequest({ ...request, category: "EVENTS", event });
    expect(draft.category).toBe("EVENTS");
    expect(draft.event.name).toBe("KubeCon");
  });
});

describe("a Marketing & Events request", () => {
  const completeEvent = (): RequestDraft => {
    const draft = emptyDraft();
    return {
      ...draft,
      category: "EVENTS",
      budget: { category: "CAT-1", businessUnit: "BU-1", product: "PRD-1", region: "REG-1", engagementCode: "ENG-1", salesforceCampaign: "" },
      budgetApproverId: "10",
      event: {
        ...emptyEvent(),
        eventType: "INDUSTRY_EVENT_SPONSORSHIP",
        shortlisted: "no",
        name: "KubeCon",
        startDate: "2027-03-01",
        endDate: "2027-03-03",
        audience: "Platform engineers",
        packageName: "Gold sponsor",
        attendedBefore: "no",
        costs: { ...emptyEvent().costs, SPONSORSHIP_FEE: "60000", SWAG: "500.50" },
        targetAccounts: "10",
        keyAccounts: "Acme, Globex",
        newPipeline: "500000",
        roiCalculatorUrl: "https://example.com/roi",
      },
    };
  };
  const missing = (draft: RequestDraft) => fields(STEP_DETAILS, draft, me);
  const messageOf = (draft: RequestDraft, field: string) => problemsForStep(STEP_DETAILS, draft, me).find((p) => p.field === field)?.message;

  it("is complete with the event, its costs and pipeline", () => {
    expect(missing(completeEvent())).toEqual([]);
    expect(fields(STEP_BUDGET, completeEvent(), me)).toEqual([]);
  });

  it("needs the budget details but no budget approver, and sends none", () => {
    expect(fields(STEP_BUDGET, { ...completeEvent(), budget: emptyDraft().budget }, me)).toContain("budgetCategory");
    expect(fields(STEP_BUDGET, { ...completeEvent(), budgetApproverId: "" }, me)).toEqual([]);
    expect(draftToInput(completeEvent()).budgetApproverId).toBe("");
  });

  it("does not ask a shortlisted event for its earlier attendance, even an industry sponsorship", () => {
    const draft = completeEvent();
    const shortlisted = { ...draft.event, shortlisted: "yes" as const, shortlistLineId: "L-42", attendedBefore: "" as const };
    expect(missing({ ...draft, event: shortlisted })).toEqual([]);
    expect(missing({ ...draft, event: { ...shortlisted, eventType: "WSO2CON" } })).toEqual([]);
  });

  it("takes several other costs, which need a description, and a partner share from 0 to 100", () => {
    const draft = completeEvent();
    const costs = { ...emptyEvent().costs };
    const withEvent = (patch: Partial<typeof draft.event>): RequestDraft => ({ ...draft, event: { ...draft.event, costs, ...patch } });
    expect(missing(withEvent({ otherCosts: [{ description: "Stickers", amount: "100" }, { description: "Lanyards", amount: "50" }], partnerInvestmentPercent: "20", newPipeline: "599" }))).toContain(
      "newPipeline",
    );
    expect(missing(withEvent({ otherCosts: [{ description: " ", amount: "100" }] }))).toContain("otherCost.0.description");
    expect(missing(withEvent({ otherCosts: [{ description: "Stickers", amount: "-5" }] }))).toContain("otherCost.0.amount");
    for (const bad of ["101", "-1", "12.5"]) {
      expect(missing(withEvent({ partnerInvestmentPercent: bad })), bad).toContain("partnerPercent");
    }
    expect(missing({ ...draft, event: { ...draft.event, partnerInvestmentPercent: "0" } })).not.toContain("partnerPercent");
  });

  it("asks for the package and earlier attendance only for an industry event sponsorship", () => {
    const draft = completeEvent();
    expect(missing({ ...draft, event: { ...draft.event, packageName: "", attendedBefore: "" } })).toEqual(["packageName", "attendedBefore"]);
    expect(missing({ ...draft, event: { ...draft.event, eventType: "WSO2CON", packageName: "", attendedBefore: "" } })).toEqual([]);
    expect(missing({ ...draft, event: { ...draft.event, attendedBefore: "yes" } })).toEqual(["previousCost", "previousPipeline"]);
  });

  it("skips target accounts, pipeline and the ROI link for a shortlisted event, which needs its Line ID", () => {
    const draft = completeEvent();
    const shortlisted = { ...draft.event, shortlisted: "yes" as const, targetAccounts: "", newPipeline: "", roiCalculatorUrl: "" };
    expect(missing({ ...draft, event: shortlisted })).toEqual(["shortlistLineId"]);
    expect(missing({ ...draft, event: { ...shortlisted, shortlistLineId: "L-42" } })).toEqual([]);
  });

  it("needs a cost, key accounts when there are target accounts, and links that are http or https", () => {
    const draft = completeEvent();
    expect(missing({ ...draft, event: { ...draft.event, costs: emptyEvent().costs } })).toContain("cost.SPONSORSHIP_FEE");
    expect(missing({ ...draft, event: { ...draft.event, keyAccounts: "" } })).toContain("keyAccounts");
    expect(missing({ ...draft, event: { ...draft.event, targetAccounts: "0", keyAccounts: "" } })).toEqual([]);
    expect(missing({ ...draft, event: { ...draft.event, roiCalculatorUrl: "ftp://example.com/roi" } })).toContain("roiCalculatorUrl");
  });

  it("needs new pipeline of at least four times the total investment", () => {
    const draft = completeEvent();
    expect(messageOf({ ...draft, event: { ...draft.event, newPipeline: "242001" } }, "newPipeline")).toBe("Must be at least 4x the total investment");
    expect(missing({ ...draft, event: { ...draft.event, newPipeline: "242002" } })).toEqual([]);
  });

  it("needs an end date on or after the start date", () => {
    const draft = completeEvent();
    expect(missing({ ...draft, event: { ...draft.event, endDate: "2027-02-01" } })).toContain("endDate");
  });

  it("sends the event and no vendors", () => {
    const input = draftToInput({ ...completeEvent(), vendors: [{ name: "Acme", website: "", contact: "", email: "", phone: "" }] });
    expect(input.category).toBe("EVENTS");
    expect(input.vendors).toEqual([]);
    expect(input.event.name).toBe("KubeCon");
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
