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
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("./ParLeadQuotas", () => ({ default: () => <div>Quota groups</div> }));

const { default: ParLeadQuotasButton } = await import("./ParLeadQuotasButton");

describe("ParLeadQuotasButton", () => {
  it("opens the quotas in a dialog, loading them only once opened", () => {
    render(<ParLeadQuotasButton />);
    expect(screen.queryByText("Quota groups")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View Quotas" }));
    expect(screen.getByRole("dialog", { name: "Top 5%/20% quotas" })).toHaveTextContent("Quota groups");
  });
});
