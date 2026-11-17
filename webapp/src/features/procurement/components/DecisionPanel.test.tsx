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
import DecisionPanel from "./DecisionPanel";

const mutate = vi.hoisted(() => vi.fn());
vi.mock("../api/useProcurement", () => ({
  useDecideRequest: () => ({ mutate, isPending: false, isError: false, error: null }),
}));

beforeEach(() => mutate.mockClear());

describe("DecisionPanel", () => {
  it("will not send either decision until the declaration is ticked", async () => {
    const user = userEvent.setup();
    render(<DecisionPanel requestId="1" />);
    await user.type(screen.getByLabelText(/Comment/), "Get a second quote.");
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Tick the declaration to send your decision.");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("will not approve until the review is confirmed", async () => {
    const user = userEvent.setup();
    render(<DecisionPanel requestId="1" />);
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Tick the declaration to send your decision.");
    expect(mutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(mutate).toHaveBeenCalledWith({ decision: "approved", comment: "", disclaimerAccepted: true });
  });

  it("will not reject without a reason, and sends it with the rejection", async () => {
    const user = userEvent.setup();
    render(<DecisionPanel requestId="1" />);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Add why the request is rejected.");
    expect(mutate).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Comment/), "Get a second quote.");
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(mutate).toHaveBeenCalledWith({ decision: "rejected", comment: "Get a second quote.", disclaimerAccepted: false });
  });
});
