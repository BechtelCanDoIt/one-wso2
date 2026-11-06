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

const user: Person = { id: "me-1", name: "Req Uester", email: "requester@example.com" };

const input = (teamLeadId: string, declared = true): PurchaseRequestInput => {
  const draft = emptyDraft(MOCK_DIRECTORY.find((p) => p.id === teamLeadId) ?? { id: teamLeadId, name: "x", email: "x@example.com" });
  return draftToInput({
    ...draft,
    category: "NON-IT",
    details: { ...draft.details, description: "Chairs", businessJustification: "Worn out" },
    declarationAccepted: declared,
  });
};

beforeEach(() => resetMockProcurementApis());

describe("the Procurement dev mock", () => {
  it("raises a request as the signed-in user, awaiting the team lead", async () => {
    const api = createMockProcurementApi(user);
    const created = await api.submitRequest(input("u-2"), []);
    expect(created).toMatchObject({ status: "submitted", requester: user, teamLead: { id: "u-2" } });
    expect(created.teamLeadDecision.decision).toBe("pending");
    expect((await api.listMyRequests()).map((r) => r.id)).toContain(created.id);
  });

  it("keeps one store per user across calls", async () => {
    const created = await createMockProcurementApi(user).submitRequest(input("u-2"), []);
    expect(await createMockProcurementApi(user).getRequest(created.id)).toBeDefined();
  });

  it("refuses the requester as their own team lead", async () => {
    const api = createMockProcurementApi(MOCK_DIRECTORY[4]);
    await expect(api.submitRequest(input(MOCK_DIRECTORY[4].id), [])).rejects.toThrow(/cannot be the team lead/);
  });

  it("refuses a team lead who is not in the directory", async () => {
    await expect(createMockProcurementApi(user).submitRequest(input("ghost"), [])).rejects.toThrow(/active WSO2 employee/);
  });

  it("refuses a submission without the declaration", async () => {
    await expect(createMockProcurementApi(user).submitRequest(input("u-2", false), [])).rejects.toThrow(/declaration/);
  });

  it("edits and resubmits only a rejected request", async () => {
    const api = createMockProcurementApi(user);
    await expect(api.resubmitRequest("seed-1", input("u-2"), [])).rejects.toThrow(/Only a rejected request/);
    const resubmitted = await api.resubmitRequest("seed-2", input("u-3"), []);
    expect(resubmitted.status).toBe("submitted");
    expect(resubmitted.teamLeadDecision.decision).toBe("pending");
  });

  it("searches the directory with a minimum length, a cap, and never returns the requester", async () => {
    const api = createMockProcurementApi({ ...user, id: "u-2", name: "Blake Rivers", email: "blake.rivers@example.com" });
    expect(await api.searchDirectory("a")).toEqual([]);
    const found = await api.searchDirectory("dr");
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((p) => p.id !== "u-2")).toBe(true);
    expect(found.length).toBeLessThanOrEqual(8);
  });
});
