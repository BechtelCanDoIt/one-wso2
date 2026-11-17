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
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PurchaseRequest } from "../../types";
import HandlingPanel from "./HandlingPanel";

const mutations = vi.hoisted(() => ({ assign: vi.fn(), unassign: vi.fn(), priority: vi.fn() }));
vi.mock("../../api/useProcurement", () => {
  const hook = (mutate: unknown) => () => ({ mutate, isPending: false, isError: false, error: null });
  return {
    useAssignRequest: hook(mutations.assign),
    useUnassignRequest: hook(mutations.unassign),
    useSetPriority: hook(mutations.priority),
  };
});

const request = (patch: Partial<PurchaseRequest>) => ({ id: "7", status: "approved", assignee: "", priority: null, ...patch }) as PurchaseRequest;

beforeEach(() => Object.values(mutations).forEach((m) => m.mockClear()));

describe("HandlingPanel", () => {
  it("offers to assign an unassigned request to the user, and not to unassign it", async () => {
    render(<HandlingPanel request={request({})} me="pat@example.com" />);
    expect(screen.queryByRole("button", { name: "Unassign" })).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Assign to me" }));
    expect(mutations.assign).toHaveBeenCalledWith(undefined);
  });

  it("offers to take over a request someone else handles, and to unassign it", async () => {
    const user = userEvent.setup();
    render(<HandlingPanel request={request({ status: "assigned", assignee: "sam@example.com" })} me="pat@example.com" />);
    await user.click(screen.getByRole("button", { name: "Take over" }));
    await user.click(screen.getByRole("button", { name: "Unassign" }));
    expect(mutations.assign).toHaveBeenCalledWith(undefined);
    expect(mutations.unassign).toHaveBeenCalled();
  });

  it("does not offer a request the user already handles to themselves again", () => {
    render(<HandlingPanel request={request({ status: "assigned", assignee: "Pat@example.com" })} me="pat@example.com" />);
    expect(screen.queryByRole("button", { name: /Take over|Assign to me/ })).toBeNull();
  });

  it("assigns to another person by email, and sets a priority", async () => {
    const user = userEvent.setup();
    render(<HandlingPanel request={request({})} me="pat@example.com" />);
    expect(screen.getByRole("button", { name: "Assign" })).toBeDisabled();
    await user.type(screen.getByLabelText(/Assign to someone else/), "sam@example.com");
    await user.click(screen.getByRole("button", { name: "Assign" }));
    expect(mutations.assign).toHaveBeenCalledWith("sam@example.com", expect.anything());
    await user.click(screen.getByRole("combobox", { name: "Priority" }));
    await user.click(await screen.findByRole("option", { name: "P2" }));
    expect(mutations.priority).toHaveBeenCalledWith("P2");
  });
});
