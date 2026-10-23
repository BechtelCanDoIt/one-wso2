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

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateAssessmentPayload, UserOption } from "../../api/riskApi";
import ReassessmentDialog from "./ReassessmentDialog";
import { riskDetail } from "./riskDetailFixture";

vi.mock("@features/security/grc/shim/useAuthApiClient", () => ({ useAuthApiClient: () => vi.fn() }));
vi.mock("@features/security/grc/shim/apiConfig", () => ({ BACKEND_BASE_URL: "http://backend.test" }));

const user = (id: number, name: string): UserOption => ({ id, display_name: name, email: "", risk_team_ids: [] });
const candidateFetchers = vi.hoisted(() => ({ owners: vi.fn(), approvers: vi.fn() }));
vi.mock("../../api/riskApi", async (importActual) => ({
  ...(await importActual<typeof import("../../api/riskApi")>()),
  fetchRiskOwnerCandidates: candidateFetchers.owners,
  fetchManagementApprovers: candidateFetchers.approvers,
}));

// The score grid and the date pickers are not under test: stand-ins that call
// the same props keep these tests about which fields reach the payload.
vi.mock("./RiskScoreGrid", () => ({
  default: ({ onChange }: { onChange: (l: number, i: number) => void }) => (
    <button onClick={() => onChange(2, 2)}>pick score</button>
  ),
}));
vi.mock("@wso2/oxygen-ui", async (importActual) => {
  const actual = await importActual<typeof import("@wso2/oxygen-ui")>();
  return {
    ...actual,
    DatePickers: {
      LocalizationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      DatePicker: ({
        label,
        value,
        onChange,
        disabled,
        slotProps,
      }: {
        label: string;
        value: Date | null;
        onChange: (d: Date | null) => void;
        disabled?: boolean;
        slotProps?: { textField?: { helperText?: string } };
      }) => (
        <>
          <input
            aria-label={label}
            disabled={disabled}
            defaultValue={value ? value.toISOString().slice(0, 10) : ""}
            onChange={(e) => onChange(e.target.value ? new Date(`${e.target.value}T00:00:00`) : null)}
          />
          {slotProps?.textField?.helperText && <span>{slotProps.textField.helperText}</span>}
        </>
      ),
    },
  };
});

beforeEach(() => {
  candidateFetchers.owners.mockReset().mockResolvedValue([user(11, "Owner"), user(21, "New Owner")]);
  candidateFetchers.approvers.mockReset().mockResolvedValue([user(12, "Approver"), user(22, "New Approver")]);
});

function renderDialog(canEditRiskDetails: boolean) {
  const onSubmit = vi.fn<(p: CreateAssessmentPayload) => Promise<void>>().mockResolvedValue();
  render(
    <ReassessmentDialog
      open
      riskCode="R-1"
      detail={riskDetail({ implementation_date: "2030-01-01" })}
      canEditRiskDetails={canEditRiskDetails}
      riskScores={[]}
      previousScore={null}
      previousIsInitial
      onClose={vi.fn()}
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
}

async function fillAssessment(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByRole("button", { name: "pick score" }));
  await u.type(screen.getByLabelText(/Progress/), "on track");
  fireEvent.change(screen.getByLabelText("Reassessment Date *"), { target: { value: "2031-06-01" } });
}

describe("ReassessmentDialog risk details", () => {
  it("lets the assigner change owner, approver and implementation date, sending only what changed", async () => {
    const u = userEvent.setup();
    const onSubmit = renderDialog(true);
    await fillAssessment(u);

    await u.click(screen.getByRole("combobox", { name: "Risk Owner" }));
    await u.click(within(await screen.findByRole("listbox")).getByText("New Owner"));
    await u.click(screen.getByRole("combobox", { name: "Management Approver" }));
    await u.click(within(await screen.findByRole("listbox")).getByText("New Approver"));
    fireEvent.change(screen.getByLabelText("Implementation Date"), { target: { value: "2032-02-02" } });
    await u.click(screen.getByRole("button", { name: "Save Assessment" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      likelihood: 2,
      impact: 2,
      progress: "on track",
      reassessment_date: "2031-06-01",
      owner_id: 21,
      management_approver_id: 22,
      implementation_date: "2032-02-02",
    });
  });

  it("sends none of the three when the assigner leaves them alone", async () => {
    const u = userEvent.setup();
    const onSubmit = renderDialog(true);
    await fillAssessment(u);
    await u.click(screen.getByRole("button", { name: "Save Assessment" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).not.toHaveProperty("owner_id");
    expect(payload).not.toHaveProperty("management_approver_id");
    expect(payload).not.toHaveProperty("implementation_date");
  });

  it("shows them read-only to anyone who is not the assigner, and never fetches candidates", async () => {
    const u = userEvent.setup();
    const onSubmit = renderDialog(false);
    expect(screen.getByText("Only the Risk Assigner can change these.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Risk Owner" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("combobox", { name: "Management Approver" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByLabelText("Implementation Date")).toBeDisabled();
    expect(candidateFetchers.owners).not.toHaveBeenCalled();

    await fillAssessment(u);
    await u.click(screen.getByRole("button", { name: "Save Assessment" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(Object.keys(onSubmit.mock.calls[0][0]).sort()).toEqual(
      ["impact", "likelihood", "progress", "reassessment_date"],
    );
  });

  it("rejects a changed implementation date in the past", async () => {
    const u = userEvent.setup();
    const onSubmit = renderDialog(true);
    await fillAssessment(u);
    fireEvent.change(screen.getByLabelText("Implementation Date"), { target: { value: "2020-01-01" } });
    await u.click(screen.getByRole("button", { name: "Save Assessment" }));

    expect(await screen.findByText("Implementation date cannot be in the past.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
