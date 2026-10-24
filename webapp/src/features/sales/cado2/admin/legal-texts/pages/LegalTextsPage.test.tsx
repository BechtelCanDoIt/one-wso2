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
import LegalTextsPage from "./LegalTextsPage";

const change = { mutate: vi.fn(), isPending: false, error: null as unknown };
const admin = {
  error: null,
  isPending: false,
  isFetching: false,
  refetch: vi.fn(),
  data: {
    eulas: [
      { version: "3.6", url: "https://wso2.com/licenses/eula/3.6", effectiveFrom: "2026-01-01", latest: true, createdByEmail: "seed", createdAt: "2026-10-24T10:00:00Z" },
    ],
    texts: [{ key: "TERMS_ONPREM_DIRECT", body: "Governed by {EULA_LINK}.", updatedByEmail: "seed", updatedAt: "2026-10-24T10:00:00Z" }],
    notices: [
      { id: 4, title: "Middle East and Africa – for new Subscribers", body: "Report usage quarterly.", showTitle: true, finePrint: false,
        channels: ["PARTNER"], regions: ["ME", "AFRICA"], dealKinds: ["FIRST_SALE"], updatedByEmail: "seed", updatedAt: "2026-10-24T10:00:00Z" },
    ],
    contractNames: [{ partnerRole: "GSI", contractName: "Global System Integrator Agreement", updatedByEmail: "seed", updatedAt: "2026-10-24T10:00:00Z" }],
    placeholders: ["{EULA_LINK}", "{CONTRACT_NAME}", "{PARTNER_NAME}", "{CONTRACT_DATE}"],
  },
};
vi.mock("@features/sales/cado2/admin/legal-texts/api/useLegalAdmin", () => ({
  useLegalAdmin: () => admin,
  useLegalAdminChange: () => change,
}));

// POC legal terms (2026-10-24).
describe("LegalTextsPage", () => {
  it("lists the EULA versions, the standard texts, the notices with when they apply, and the partner agreements", () => {
    render(<LegalTextsPage />);
    const eulas = within(screen.getByRole("table", { name: "EULA versions" }));
    expect(eulas.getByText("Latest")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "On-premises products · direct deals" })).toHaveTextContent("Governed by {EULA_LINK}.");
    expect(screen.getByText(/Placeholders: \{EULA_LINK\}/)).toBeInTheDocument();
    const notices = within(screen.getByRole("table", { name: "Notices" }));
    expect(notices.getByText("Partner")).toBeInTheDocument();
    expect(notices.getByText("ME, AFRICA")).toBeInTheDocument();
    expect(notices.getByText("First sale")).toBeInTheDocument();
    const agreements = within(screen.getByRole("table", { name: "Partner agreements" }));
    expect(agreements.getByText("Distributor")).toBeInTheDocument(); // a role seen in Salesforce, not mapped yet
  });

  it("adds an EULA version", async () => {
    render(<LegalTextsPage />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Version" }), "3.7");
    await user.type(screen.getByRole("textbox", { name: "Link" }), "https://wso2.com/licenses/eula/3.7");
    const from = screen.getByLabelText("Applies from");
    await user.type(from, "2026-11-01");
    await user.click(screen.getByRole("button", { name: "Add version" }));
    expect(change.mutate).toHaveBeenCalledWith(
      { kind: "eula", version: "3.7", url: "https://wso2.com/licenses/eula/3.7", effectiveFrom: "2026-11-01" },
      expect.anything(),
    );
  });
});
