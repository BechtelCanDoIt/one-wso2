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
import type { Person, PurchaseRequestInput } from "../types";

const { authedGet } = vi.hoisted(() => ({ authedGet: vi.fn() }));
vi.mock("@api/http", async (importOriginal) => ({ ...(await importOriginal<typeof import("@api/http")>()), authedGet }));

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

const asked = (): string[] => authedGet.mock.calls.map((c) => String(c[0]));

beforeEach(() => {
  authedGet.mockReset();
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

  it("does not reach the backend when submitting yet, and refuses to resubmit a real request", async () => {
    const input = { category: "NON-IT", additionalApprovers: [], budgetApproverId: "", declarationAccepted: true } as unknown as PurchaseRequestInput;
    authedGet.mockClear();
    await api().submitRequest({ ...input, details: { description: "Chairs" }, vendors: [], budget: {}, notes: "" } as unknown as PurchaseRequestInput, []);
    expect(authedGet).not.toHaveBeenCalled();
    await expect(api().resubmitRequest("5", input, [])).rejects.toThrow(/not connected to the backend yet/);
  });
});
