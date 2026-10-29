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
import { MemoryRouter, Route, Routes } from "react-router";
import TeamMemberPage from "./TeamMemberPage";
import type { Employee, ReportingLine } from "../../api/types";

const member = {
  employeeId: "LK100003",
  firstName: "Jane",
  lastName: "Perera",
  workEmail: "jane@wso2.com",
  designation: "Senior Engineer",
  employeeStatus: "Active",
  employeeThumbnail: null,
} as Employee;

let reportingLine: { data?: ReportingLine; isError: boolean } = { isError: false };

vi.mock("../api/useTeamSearch", () => ({
  useTeamMember: () => ({ data: member, isLoading: false, isError: false, error: null, refetch: vi.fn() }),
  useTeamMemberReportingLine: () => reportingLine,
}));

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/me/my-team/LK100003"]}>
      <Routes>
        <Route path="/me/my-team/:employeeId" element={<TeamMemberPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  reportingLine = { isError: false };
});

describe("TeamMemberPage reporting line", () => {
  it("says who links an indirect report into the team", () => {
    reportingLine = {
      isError: false,
      data: {
        relation: "INDIRECT",
        through: { employeeId: "LK100002", firstName: "Test", lastName: "Person" },
      },
    };
    renderPage();
    expect(screen.getByRole("link", { name: "Test Person" })).toBeInTheDocument();
  });

  // The note is a nicety on top of the record. A backend without the endpoint
  // answers 404, and the record must still show.
  it("shows the record without the note when the reporting line fails", () => {
    reportingLine = { isError: true };
    renderPage();
    expect(screen.getByRole("heading", { name: "Jane Perera" })).toBeInTheDocument();
    expect(screen.queryByText(/additional manager/)).toBeNull();
  });
});
