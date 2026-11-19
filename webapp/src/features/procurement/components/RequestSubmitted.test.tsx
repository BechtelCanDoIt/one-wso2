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
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequestSubmitted from "./RequestSubmitted";

describe("RequestSubmitted", () => {
  it("shows the reference number and offers another request or closing", async () => {
    const onSubmitAnother = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<RequestSubmitted reference="PR-2026-0004" onSubmitAnother={onSubmitAnother} onClose={onClose} />);

    expect(screen.getByText("Requisition submitted successfully")).toBeInTheDocument();
    expect(screen.getByText("PR-2026-0004")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "procurement@wso2.com" })).toHaveAttribute("href", "mailto:procurement@wso2.com");

    await user.click(screen.getByRole("button", { name: "Submit another request" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onSubmitAnother).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
