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

import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ParCycleConfigurations } from "../api/types";

const globalConfig: ParCycleConfigurations = {
  employeeParQuestion: "What went well?",
  threeSixtyReviewQuestion: "What could be better?",
  parRatings: ["Successful", "Needs Improvements", "Step Up"],
  threeSixtyReviewRatings: ["Satisfactory", "Unsatisfactory"],
  employeeRatings: ["Successful", "Needs Improvements"],
  leadershipAllowedRatings: ["Successful", "Step Up"],
  top5p20pEnabledRating: "Successful",
  evidenceEnabledRating: "Needs Improvements",
  missedDeadlineRating: "Needs Improvements",
  leadershipMissedDeadlineRating: "Step Up",
};
const mutate = vi.fn();
const loaded = { isSuccess: true, data: globalConfig };
let configQuery: Record<string, unknown> = loaded;

vi.mock("../api/useParAdmin", () => ({
  useParGlobalConfig: () => configQuery,
}));
vi.mock("../api/useParMutations", () => ({
  useCreateParCycle: () => ({ mutate, isPending: false, isError: false, error: null }),
}));
// A plain field, so a test can type a date.
vi.mock("./ParDateField", () => ({
  default: ({ ariaLabel, value, onChange }: { ariaLabel: string; value: string; onChange: (v: string) => void }) => (
    <input aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const { default: ParCycleCreationDialog } = await import("./ParCycleCreationDialog");

const originalConfig = window.config;
const setPar2 = (on: boolean) => {
  window.config = { ...(originalConfig ?? {}), ONE_WSO2_PREVIEW_FEATURES: { par2: on } } as Window["config"];
};
afterEach(() => {
  window.config = originalConfig;
  configQuery = loaded;
  mutate.mockReset();
});

function fillNameAndDates() {
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "2027 H1" } });
  const dates: [string, string][] = [
    ["PAR cycle start date", "2027-01-01"],
    ["PAR cycle end date", "2027-06-30"],
    ["PAR evaluation closing date", "2027-07-31"],
    ["Deadline for employee PAR", "2027-07-05"],
    ["Deadline for 360° feedback", "2027-07-10"],
    ["Deadline for lead's feedback", "2027-07-15"],
    ["Top 5%/20% rating submission", "2027-07-20"],
    ["PAR F2F deadline", "2027-07-25"],
  ];
  for (const [label, value] of dates) fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("ParCycleCreationDialog", () => {
  it("creates a PAR 2.0 cycle with its ratings and rules, and asks nothing PAR 1.0, with par2 on", () => {
    setPar2(true);
    render(<ParCycleCreationDialog open onClose={vi.fn()} />);
    expect(screen.queryByText(/Use PAR 2\.0 forms/)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Employee PAR question" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "360° feedback ratings" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("PAR creation date")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Employees" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Leadership group" })).toBeInTheDocument();
    expect(screen.getByText("Missed deadline: leadership")).toBeInTheDocument();

    fillNameAndDates();
    fireEvent.click(screen.getByRole("button", { name: "Start Cycle" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Start PAR Cycle" })).getByRole("button", { name: "Confirm" }));
    const [payload] = mutate.mock.calls[0];
    expect(payload.par2Forms).toBe(true);
    expect(payload.parCycleConfigurations).toEqual({
      employeeRatings: ["Successful", "Needs Improvements"],
      leadershipAllowedRatings: ["Successful", "Step Up"],
      top5p20pEnabledRating: "Successful",
      evidenceEnabledRating: "Needs Improvements",
      missedDeadlineRating: "Needs Improvements",
      leadershipMissedDeadlineRating: "Step Up",
    });
  });

  it("can't start once a rating a rule uses is removed", () => {
    setPar2(true);
    render(<ParCycleCreationDialog open onClose={vi.fn()} />);
    fillNameAndDates();
    expect(screen.getByRole("button", { name: "Start Cycle" })).toBeEnabled();

    const stepUp = within(screen.getByRole("combobox", { name: "Leadership group" }).closest(".MuiAutocomplete-root") as HTMLElement)
      .getByText("Step Up")
      .closest(".MuiChip-root") as HTMLElement;
    fireEvent.click(within(stepUp).getByTestId("CancelIcon"));
    expect(screen.getByRole("button", { name: "Start Cycle" })).toBeDisabled();
  });

  it("says when the configurations can't load, offers a retry, and can't start, with par2 on", () => {
    setPar2(true);
    const refetch = vi.fn();
    configQuery = { isSuccess: false, isError: true, error: new Error("Network down"), refetch, isFetching: false };
    render(<ParCycleCreationDialog open onClose={vi.fn()} />);
    fillNameAndDates();
    expect(screen.getByText(/Couldn't load the global PAR configurations\./)).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Employees" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Cycle" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("keeps the questions and both rating lists, with par2 off", () => {
    setPar2(false);
    render(<ParCycleCreationDialog open onClose={vi.fn()} />);
    expect(screen.queryByText(/Use PAR 2\.0 forms/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("PAR creation date")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Employee PAR question" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "PAR ratings" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "360° feedback ratings" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Leadership group" })).not.toBeInTheDocument();

    fillNameAndDates();
    fireEvent.click(screen.getByRole("button", { name: "Start Cycle" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Start PAR Cycle" })).getByRole("button", { name: "Confirm" }));
    const [payload] = mutate.mock.calls[0];
    expect(payload.par2Forms).toBeUndefined();
    expect(payload.parCycleConfigurations).toEqual({
      employeeParQuestion: "What went well?",
      threeSixtyReviewQuestion: "What could be better?",
      parRatings: ["Successful", "Needs Improvements", "Step Up"],
      threeSixtyReviewRatings: ["Satisfactory", "Unsatisfactory"],
    });
  });
});
