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

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ParLeadQuotaGroups from "./ParLeadQuotaGroups";
import type { ParSpecialRatingAllocation } from "../api/types";

const row = (quotaId: number, team: string, department: string, top5: number, top20: number): ParSpecialRatingAllocation => ({
  parBusinessUnit: "Engineering",
  parDepartment: department,
  parTeam: team,
  parQuotaId: quotaId,
  parSpecialQuotaName: quotaId === 1 ? "platform" : "docs",
  parTop5Quota: top5,
  parTop20Quota: top20,
});

const rows = [
  row(1, "Gateway", "Integration", 1, 3),
  row(1, "Identity", "Security", 1, 3),
  row(1, "Gateway", "Cloud", 1, 3),
  row(2, "Technical Writing", "Documentation", 1, 0),
];

describe("ParLeadQuotaGroups", () => {
  it("shows each quota's allocation and team count, with the first quota's teams open, once each", () => {
    render(<ParLeadQuotaGroups rows={rows} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    const platform = screen.getByRole("button", { name: /platform/ });
    expect(platform).toHaveAttribute("aria-expanded", "true");
    expect(platform).toHaveTextContent("2 teams");
    expect(platform).toHaveTextContent("Top 5% · 1");
    expect(platform).toHaveTextContent("Top 20% · 3");
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Gateway", "Identity"]);
    expect(screen.queryByText("Engineering")).not.toBeInTheDocument();
    expect(screen.queryByText("Integration")).not.toBeInTheDocument();
  });

  it("shows a small team's single slot as one, for either rating, and opens its teams on click", () => {
    render(<ParLeadQuotaGroups rows={rows} />);
    const docs = screen.getByRole("button", { name: /docs/ });
    expect(docs).toHaveAttribute("aria-expanded", "false");
    expect(docs).toHaveTextContent("Top 5% or 20% · 1");
    expect(screen.getByText(/one person can be placed in Top 5% or Top 20%, not one in each/)).toBeInTheDocument();
    fireEvent.click(docs);
    expect(docs).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Technical Writing")).toBeVisible();
  });
});
