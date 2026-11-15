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
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApprovalMatrix, ApprovalPreview } from "@features/sales/cado2/approvals/api/approvalTypes";
import { placementsOf } from "@features/sales/cado2/approvals/model/matrixGrid";
import DiscountMatrixDialog from "./DiscountMatrixDialog";

const ladder = (am: string, rd: string, gm: string, cro: string) => [
  { role: "ACCOUNT_MANAGER", maxPercent: am },
  { role: "REGIONAL_DIRECTOR", maxPercent: rd },
  { role: "AREA_GM", maxPercent: gm },
  { role: "CRO", maxPercent: cro },
  { role: "CFO", maxPercent: null },
];
const rule = (classification: string, productUnit: string, groupCode: string) => ({
  kind: "RULE" as const,
  products: [],
  skuPattern: "",
  classification,
  productUnit,
  groupCode,
});
const matrix: ApprovalMatrix = {
  groups: [
    { code: "ONPREM_API", name: "API Management", ladder: ladder("5", "7", "10", "12"), reviewers: [] },
    { code: "SAAS_IAM", name: "IAM", ladder: ladder("3", "5", "7", "10"), reviewers: [] },
    { code: "CUSTOMER_TRAINING", name: "Customer Training", ladder: ladder("5", "8", "10", "15"), reviewers: [] },
  ],
  mappings: [rule("PS", "APIM", "ONPREM_API"), rule("CL", "Asgardeo", "SAAS_IAM"), rule("TR", "", "CUSTOMER_TRAINING")],
  settings: {
    shortTermMonths: "12",
    longTermMonths: "36",
    paymentTermsDays: 45,
    downsellCeoPercent: "10",
    saasClassification: "CL",
    billingApproval: [],
    regionalRoles: [],
  },
  roles: [{ code: "AREA_GM", label: "Area GM", ladder: true, reviewer: false }],
};
const preview: ApprovalPreview = {
  steps: [],
  blockers: [],
  pending: [],
  notes: [],
  invalid: [],
  matrix,
  lines: [
    { lineNumber: 1, productName: "WSO2 Gateway", groupCode: "ONPREM_API", reachedRole: "AREA_GM" },
    { lineNumber: 2, productName: "API Control Plane", groupCode: "ONPREM_API", reachedRole: "REGIONAL_DIRECTOR" },
    { lineNumber: 3, productName: "MAUs", groupCode: "SAAS_IAM", reachedRole: null },
    { lineNumber: 4, productName: "Choreo ELA", groupCode: null, reachedRole: null },
  ],
};

describe("DiscountMatrixDialog", () => {
  it("places the quote's lines, circling the highest approver per group", async () => {
    const user = userEvent.setup();
    render(<DiscountMatrixDialog open onClose={vi.fn()} preview={preview} loading={false} error={null} />);
    const grid = within(screen.getByRole("table", { name: "Discount approval matrix" }));
    const api = within(grid.getByText("ONPREM_API").closest("tr") as HTMLElement);
    expect(api.getByText("Line 1 · WSO2 Gateway")).toBeInTheDocument();
    expect(api.getByText("Line 2 · API Control Plane")).toBeInTheDocument();
    expect(api.getByLabelText("10%, the highest approver this quote needs")).toBeInTheDocument();
    expect(screen.getByText(/No discount group covers line 4 \(Choreo ELA\)\. A discount on it goes to Deal Desk only/)).toBeInTheDocument();

    expect(grid.getByText("Customer Training")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Only this quote's groups"));
    expect(screen.queryByText("Customer Training")).toBeNull();
  });

  it("says why when the quote can't be evaluated yet", () => {
    const invalid = { ...preview, matrix: null, lines: [], invalid: [{ field: "sfOpportunityId", message: "Choose the account and opportunity to see the approvals" }] };
    render(<DiscountMatrixDialog open onClose={vi.fn()} preview={invalid} loading={false} error={null} />);
    expect(screen.getByText("Choose the account and opportunity to see the approvals")).toBeInTheDocument();
  });

  it("keeps the furthest role per group", () => {
    expect(placementsOf(preview).get("ONPREM_API")?.reachedRole).toBe("AREA_GM");
    expect(placementsOf(preview).get("SAAS_IAM")?.reachedRole).toBeNull();
    expect(placementsOf(preview).has("CUSTOMER_TRAINING")).toBe(false);
  });
});
