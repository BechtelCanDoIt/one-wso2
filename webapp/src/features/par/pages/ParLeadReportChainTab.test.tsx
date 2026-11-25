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
import type { ParChainReport, ParCycle } from "../api/types";

const cycle = {
  parCycleId: 2,
  parCycleName: "2026 H2",
  parCycleStartDate: "2026-11-01",
  parCycleEndDate: "2026-12-31",
} as ParCycle;

const report = (email: string, name: string, lead: boolean) =>
  ({
    parRatingId: email.length,
    parEmployeeEmail: email,
    parEmployeeName: name,
    parEmployeeStatus: "PENDING",
    parLeadStatus: "PENDING",
    par360ReviewCounts: { requestedReviewCount: 0, sharedReviewCount: 0 },
    parF2fStatus: "PENDING",
    par360ReviewStatus: "PENDING",
    parRating: "Not Assigned",
    parSpecialRating: "Not Assigned",
    isEmployeeALead: lead ? "True" : "False",
  }) as unknown as ParChainReport;

const reportsOf: Record<string, ParChainReport[]> = {
  "me@example.com": [report("alex@example.com", "Alex", true)],
  "alex@example.com": [report("bea@example.com", "Bea", true)],
  "bea@example.com": [report("cal@example.com", "Cal", false)],
};

vi.mock("@features/my/api/useMeProfile", () => ({
  useMeProfile: () => ({ data: { userInfo: { workEmail: "me@example.com" } }, isLoading: false, isError: false }),
}));
vi.mock("../api/useParData", () => ({
  useActiveParCycle: () => ({ data: [cycle], isLoading: false, isError: false }),
}));
vi.mock("../api/useLeadReports", () => ({
  useParReportLevels: (_cycleId: number, email: string) => ({ data: reportsOf[email], isLoading: false, isError: false }),
}));
vi.mock("@features/leave/api/useLeaveData", () => ({ useLeaveEmployees: () => ({ data: [] }) }));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));
vi.mock("../components/ParLeadReviewTabs", () => ({ default: () => null }));

const { default: ParLeadReportChainTab } = await import("./ParLeadReportChainTab");

describe("ParLeadReportChainTab", () => {
  it("shows the trail back up only once a lead's team is open, ending on that team as plain text", () => {
    render(<ParLeadReportChainTab />);
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.queryByText("Direct Reports")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View Alex's Subordinates" }));
    expect(screen.getByText("Bea")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Direct Reports" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Alex" })).not.toBeInTheDocument();
    expect(screen.getByText("Alex", { selector: "[aria-current='page']" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View Bea's Subordinates" }));
    expect(screen.getByText("Cal")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Alex" }));
    expect(screen.getByText("Bea")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Direct Reports" }));
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.queryByText("Direct Reports")).not.toBeInTheDocument();
  });
});
