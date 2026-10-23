// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

// Add Advisory sits at the right, above the table it adds to.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UmtUpdateSummary } from "../../../api/umtUpdates";

vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));
vi.mock("../../../api/useUmtSecurityAdvisory", () => ({
  useUmtSaveSecurityAdvisories: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUmtValidateSecurityAdvisory: () => ({ data: undefined, isError: false, isFetching: false, error: null }),
}));

const { default: UmtSecurityAdvisoryStep } = await import("./UmtSecurityAdvisoryStep");

function renderStep() {
  const update = {
    id: 42,
    lifecycle: "SecurityUpdateLifecycle",
    securityAdvisories: [{ securityAdvisoryName: "WSO2-2026-0001", userConsentFlag: false }],
  } as UmtUpdateSummary;
  render(<UmtSecurityAdvisoryStep id="42" update={update} />);
}

const addButton = () => screen.getByRole("button", { name: "Add Advisory" });

describe("Add Advisory on the Security Advisory step", () => {
  it("sits at the right end of its row", () => {
    renderStep();

    expect(addButton().parentElement).toHaveStyle({ justifyContent: "flex-end" });
  });

  it("is above the advisory table", () => {
    renderStep();

    expect(addButton().compareDocumentPosition(screen.getByRole("grid")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("still opens the Add Security Advisory dialog", async () => {
    renderStep();

    await userEvent.click(addButton());

    expect(screen.getByText("Add Security Advisory")).toBeInTheDocument();
  });
});
