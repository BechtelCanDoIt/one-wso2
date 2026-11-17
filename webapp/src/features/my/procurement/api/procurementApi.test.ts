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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@api/http";
import { draftToInput, emptyDraft } from "../request-form/requestFormModel";
import type { Person } from "../types";

const { authedGet, authedPost, authedPut } = vi.hoisted(() => ({ authedGet: vi.fn(), authedPost: vi.fn(), authedPut: vi.fn() }));
vi.mock("@api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@api/http")>()),
  authedGet,
  authedPost,
  authedPut,
}));

import { createProcurementApi } from "./procurementApi";
import { resetMockProcurementApis } from "./mockProcurementApi";

const user: Person = { id: "me@example.com", name: "Me Myself", email: "me@example.com" };
const getToken = async () => "token";

/** What the backend answers, by the end of the path it is asked. */
const answers: Record<string, unknown> = {
  "/me": { email: "me@example.com", roles: ["procurement_user"] },
  "/me/team-lead": { approvalExempt: false, teamLead: { email: "lead@example.com", name: "Lead" } },
  "/reference-data?type=BUDGET_CATEGORY": [{ code: "CAT-1", label: "Software" }],
  "/reference-data?type=BUSINESS_UNIT": [{ code: "BU-1", label: "Sales" }],
  "/reference-data?type=PRODUCT": [{ code: "PRD-1", label: "Choreo" }],
  "/reference-data?type=REGION": [{ code: "REG-1", label: "Global" }],
  "/budget-approvers?businessUnit=BU-1": [{ id: 10, name: "Budget Owner" }],
  "/budget-approvers?businessUnit=BU-1&region=REG-1": [{ id: 11, name: "Regional Owner" }],
  "/engagement-codes?businessUnit=Sales": [{ code: "ENG-1", name: "Platform" }],
  "/directory/employees?query=dre": [{ email: "drew.parker@example.com", name: "Drew Parker" }, { email: "intern@example.com", name: "An Intern" }],
  "/directory/employees?query=dre&leadsOnly=true": [{ email: "drew.parker@example.com", name: "Drew Parker" }],
  "/requests?limit=100": [
    { id: 3, referenceNo: "PR-2026-00003", title: "ZoomInfo", category: "IT", status: "PENDING_APPROVAL", version: 1, submittedOn: "2026-11-01T00:00:00Z", updatedOn: "2026-11-01T00:00:00Z" },
  ],
};

const requestDetail = {
  id: 7,
  referenceNo: "PR-2026-00007",
  title: "Chairs",
  category: "NON_IT",
  status: "PENDING_APPROVAL",
  version: 1,
  submittedOn: "2026-11-01T00:00:00Z",
  updatedOn: "2026-11-01T00:00:00Z",
  requesterName: "Me Myself",
  requesterEmail: "me@example.com",
  requirementDetails: "40 chairs",
  vendorName: null,
  businessJustification: "Needed",
  roi: null,
  additionalSpecifications: null,
  salesforceCampaign: null,
  notes: null,
  vendors: [],
  answers: [],
  budgetCategoryCode: null,
  businessUnitCode: null,
  productCode: null,
  regionCode: null,
  engagementCode: null,
  budgetApproverId: null,
  budgetApproverName: null,
  teamLeadEmail: "lead@example.com",
  additionalApprovers: [],
  itDetails: null,
  saasDetails: null,
  decisions: [],
  createdOn: "2026-11-01T00:00:00Z",
};

const nonItInput = () => {
  const draft = emptyDraft();
  draft.category = "NON-IT";
  draft.details.description = "40 chairs";
  draft.details.businessJustification = "Needed";
  draft.declarationAccepted = true;
  return draftToInput(draft);
};

const asked = (): string[] => authedGet.mock.calls.map((c) => String(c[0]));

beforeEach(() => {
  authedGet.mockReset();
  authedPost.mockReset();
  authedPut.mockReset();
  answers["/requests/7"] = requestDetail;
  authedGet.mockImplementation(async (url: string) => {
    if (!(url in answers)) throw new Error(`unexpected request: ${url}`);
    return answers[url];
  });
  resetMockProcurementApis();
});

describe("the Procurement backend adapter", () => {
  const api = () => createProcurementApi(getToken, user);

  it("combines /me and /me/team-lead, with the name from the token", async () => {
    expect(await api().getMe()).toMatchObject({
      name: "Me Myself",
      roles: ["procurement_user"],
      teamLead: { email: "lead@example.com" },
      approvalExempt: false,
    });
    expect(asked().sort()).toEqual(["/me", "/me/team-lead"]);
  });

  it("combines the four reference lists into labelled choices", async () => {
    expect(await api().getLookups()).toEqual({
      budgetCategories: [{ value: "CAT-1", label: "Software" }],
      businessUnits: [{ value: "BU-1", label: "Sales" }],
      products: [{ value: "PRD-1", label: "Choreo" }],
      regions: [{ value: "REG-1", label: "Global" }],
    });
    expect(asked()).toHaveLength(4);
  });

  it("asks for approvers by the unit's code and/or region, and for none when neither is chosen", async () => {
    expect(await api().getBudgetApprovers({ businessUnit: "BU-1", region: "" })).toEqual([{ id: "10", name: "Budget Owner" }]);
    expect(await api().getBudgetApprovers({ businessUnit: "BU-1", region: "REG-1" })).toEqual([{ id: "11", name: "Regional Owner" }]);
    authedGet.mockClear();
    expect(await api().getBudgetApprovers({ businessUnit: "", region: "" })).toEqual([]);
    expect(authedGet).not.toHaveBeenCalled();
  });

  it("asks for engagement codes by the unit's name, and for none without one", async () => {
    expect(await api().getEngagementCodes("Sales")).toEqual([{ value: "ENG-1", label: "ENG-1 - Platform" }]);
    authedGet.mockClear();
    expect(await api().getEngagementCodes("")).toEqual([]);
    expect(authedGet).not.toHaveBeenCalled();
  });

  it("searches the directory and returns people", async () => {
    expect((await api().searchDirectory("dre", false)).map((p) => p.name)).toEqual(["Drew Parker", "An Intern"]);
  });

  it("asks the backend for leads only when that is wanted, so the answer holds only people who can approve", async () => {
    expect(await api().searchDirectory("dre", true)).toEqual([
      { id: "drew.parker@example.com", name: "Drew Parker", email: "drew.parker@example.com" },
    ]);
    expect(asked()).toEqual(["/directory/employees?query=dre&leadsOnly=true"]);
  });

  it("lists the user's requests as rows, one page of 100", async () => {
    expect(await api().listMyRequests()).toEqual([
      { id: "3", reference: "PR-2026-00003", title: "ZoomInfo", category: "IT", status: "submitted", submittedAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z" },
    ]);
  });

  it("surfaces a failed read rather than an empty answer", async () => {
    authedGet.mockRejectedValue(new Error("boom"));
    await expect(api().listMyRequests()).rejects.toThrow("boom");
  });

  it("saves the request as a draft, then submits it with the declaration, and returns it as read back", async () => {
    authedPost.mockImplementation(async (url: string) => (url === "/requests" ? { id: 7, status: "DRAFT" } : null));
    const submitted = await api().submitRequest(nonItInput());
    expect(authedPost.mock.calls.map((c) => c[0])).toEqual(["/requests", "/requests/7/submit"]);
    expect(authedPost.mock.calls[0][2]).toMatchObject({ category: "NON_IT", requirementDetails: "40 chairs", businessJustification: "Needed", itDetails: null });
    expect(authedPost.mock.calls[1][2]).toEqual({ commitmentConfirmed: true });
    expect(submitted).toMatchObject({ id: "7", reference: "PR-2026-00007", status: "submitted" });
  });

  it("saves over the draft a failed submit left behind, instead of leaving another one", async () => {
    authedPost.mockImplementation(async (url: string) => {
      if (url === "/requests") return { id: 7, status: "DRAFT" };
      if (authedPost.mock.calls.filter((c) => c[0] === "/requests/7/submit").length === 1) throw new Error("boom");
      return null;
    });
    const client = api();
    await expect(client.submitRequest(nonItInput())).rejects.toThrow("boom");
    await client.submitRequest(nonItInput());
    expect(authedPost.mock.calls.filter((c) => c[0] === "/requests")).toHaveLength(1);
    expect(authedPut.mock.calls.map((c) => c[0])).toEqual(["/requests/7"]);
  });

  it("starts a new draft when the one left behind is gone", async () => {
    authedPost.mockImplementation(async (url: string) => {
      if (url === "/requests") return { id: 7, status: "DRAFT" };
      if (authedPost.mock.calls.filter((c) => c[0] === "/requests/7/submit").length === 1) throw new Error("boom");
      return null;
    });
    authedPut.mockRejectedValue(new HttpError("/requests/7", 409, ""));
    const client = api();
    await expect(client.submitRequest(nonItInput())).rejects.toThrow("boom");
    await client.submitRequest(nonItInput());
    expect(authedPost.mock.calls.filter((c) => c[0] === "/requests")).toHaveLength(2);
  });

  it("replaces a rejected request, then submits it again", async () => {
    authedPost.mockResolvedValue(null);
    await api().resubmitRequest("7", nonItInput());
    expect(authedPut.mock.calls.map((c) => c[0])).toEqual(["/requests/7"]);
    expect(authedPost.mock.calls.map((c) => c[0])).toEqual(["/requests/7/submit"]);
  });

  it("cancels a request and returns it as read back", async () => {
    authedPost.mockResolvedValue(null);
    await api().cancelRequest("7");
    expect(authedPost.mock.calls.map((c) => c[0])).toEqual(["/requests/7/cancel"]);
  });
});
