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

import { beforeEach, describe, expect, it } from "vitest";
import type { Person, PurchaseRequestInput } from "../types";
import { draftToInput, emptyDraft } from "../request-form/requestFormModel";
import { createMockProcurementApi, MOCK_DIRECTORY, resetMockProcurementApis } from "./mockProcurementApi";

const user: Person = { id: "requester@example.com", name: "Req Uester", email: "requester@example.com" };

const input = (approvers: Person[] = [], declared = true): PurchaseRequestInput => {
  const draft = emptyDraft();
  return draftToInput({
    ...draft,
    category: "NON-IT",
    additionalApprovers: approvers,
    details: { ...draft.details, description: "Chairs", businessJustification: "Worn out" },
    declarationAccepted: declared,
  });
};

beforeEach(() => resetMockProcurementApis());

describe("the Procurement sample data", () => {
  it("knows the signed-in user, their default team lead and that they need approval", async () => {
    const me = await createMockProcurementApi(user).getMe();
    expect(me).toMatchObject({ email: user.email, teamLead: { name: "Jordan Ellis" }, approvalExempt: false });
  });

  it("raises a request as the signed-in user, awaiting approval, with a backend-style reference", async () => {
    const api = createMockProcurementApi(user);
    const created = await api.submitRequest(input(), []);
    expect(created).toMatchObject({ status: "submitted", requester: user });
    expect(created.reference).toMatch(/^PR-\d{4}-\d{5}$/);
    expect(created.teamLeadDecision.decision).toBe("pending");
    expect((await api.listMyRequests()).map((r) => r.id)).toContain(created.id);
  });

  it("lists rows without the request's content, newest first", async () => {
    const rows = await createMockProcurementApi(user).listMyRequests();
    expect(rows.map((r) => r.reference)).toEqual(["PR-2026-00003", "PR-2026-00002", "PR-2026-00001"]);
    expect(Object.keys(rows[0]).sort()).toEqual(["category", "id", "reference", "status", "submittedAt", "title", "updatedAt"]);
  });

  it("keeps one store per user across calls", async () => {
    const created = await createMockProcurementApi(user).submitRequest(input(), []);
    expect(await createMockProcurementApi(user).getRequest(created.id)).toBeDefined();
  });

  it("refuses the requester or the team lead as an additional approver", async () => {
    const api = createMockProcurementApi(user);
    const teamLead = MOCK_DIRECTORY[10];
    await expect(api.submitRequest(input([user]), [])).rejects.toThrow(/cannot be you or your team lead/);
    await expect(api.submitRequest(input([teamLead]), [])).rejects.toThrow(/cannot be you or your team lead/);
  });

  it("refuses a submission without the declaration", async () => {
    await expect(createMockProcurementApi(user).submitRequest(input([], false), [])).rejects.toThrow(/declaration/);
  });

  it("edits and resubmits only a rejected request", async () => {
    const api = createMockProcurementApi(user);
    await expect(api.resubmitRequest("seed-1", input(), [])).rejects.toThrow(/Only a rejected request/);
    const resubmitted = await api.resubmitRequest("seed-2", input(), []);
    expect(resubmitted.status).toBe("submitted");
    expect(resubmitted.teamLeadDecision.decision).toBe("pending");
  });

  it("searches the directory from 3 characters, capped, and never returns the requester", async () => {
    const api = createMockProcurementApi({ ...user, id: "blake.rivers@example.com", name: "Blake Rivers", email: "blake.rivers@example.com" });
    expect(await api.searchDirectory("bl", false)).toEqual([]);
    const found = await api.searchDirectory("dre", false);
    expect(found.map((p) => p.name)).toEqual(["Drew Parker"]);
    expect((await api.searchDirectory("bla", false)).map((p) => p.email)).not.toContain("blake.rivers@example.com");
    expect(found.length).toBeLessThanOrEqual(10);
  });

  it("leaves out people who are not leads when only leads are asked for", async () => {
    const api = createMockProcurementApi(user);
    expect((await api.searchDirectory("cas", false)).map((p) => p.name)).toEqual(["Casey Lane"]);
    expect(await api.searchDirectory("cas", true)).toEqual([]);
    expect((await api.searchDirectory("dre", true)).map((p) => p.name)).toEqual(["Drew Parker"]);
  });

  it("serves dependent lists only once a business unit or region is chosen", async () => {
    const api = createMockProcurementApi(user);
    expect(await api.getEngagementCodes("")).toEqual([]);
    expect((await api.getEngagementCodes("Sales")).length).toBeGreaterThan(0);
    expect(await api.getBudgetApprovers({ businessUnit: "", region: "" })).toEqual([]);
    expect(await api.getBudgetApprovers({ businessUnit: "BU-4", region: "" })).toEqual([{ id: "10", name: "Budget Owner" }]);
  });
});
