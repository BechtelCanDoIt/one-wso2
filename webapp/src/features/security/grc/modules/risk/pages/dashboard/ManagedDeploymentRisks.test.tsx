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

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ManagedServicesRisks } from "../../api/riskApi";
import ManagedDeploymentRisks from "./ManagedDeploymentRisks";

const data: ManagedServicesRisks = {
  customer_count: 5,
  open_risks: 7,
  closed_risks: 0,
  high_open: 3,
  high_closed: 0,
  themes: [
    { category_id: 1, category_name: "Disaster Recovery", customers: 4, total: 5, high: 2, medium: 2, low: 1 },
    { category_id: 2, category_name: "WAF / Firewall", customers: 2, total: 2, high: 1, medium: 1, low: 0 },
  ],
};

describe("ManagedDeploymentRisks", () => {
  it("lists each theme with its customers out of the total and its risk count", () => {
    render(<ManagedDeploymentRisks data={data} />);

    const row = screen.getByRole("row", { name: /Disaster Recovery/ });
    expect(within(row).getByText("4/5")).toBeInTheDocument();
    expect(within(row).getByText("5")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /WAF/ })).getByText("2/5")).toBeInTheDocument();
  });

  it("draws one labelled segment per non-empty level", () => {
    render(<ManagedDeploymentRisks data={data} />);

    const bars = within(screen.getByRole("list", { name: /open risks by theme/i }));
    const waf = bars.getAllByRole("listitem")[1];
    expect(within(waf).getByTitle("High: 1")).toBeInTheDocument();
    expect(within(waf).getByTitle("Medium: 1")).toBeInTheDocument();
    expect(within(waf).queryByTitle(/Low/)).not.toBeInTheDocument();
  });

  it("calls out High severity risks when any exist", () => {
    render(<ManagedDeploymentRisks data={data} />);
    expect(screen.getByText(/3 High severity risks — none closed/)).toBeInTheDocument();
  });

  it("omits the callout when there are no High risks", () => {
    render(<ManagedDeploymentRisks data={{ ...data, high_open: 0 }} />);
    expect(screen.queryByText(/High severity/)).not.toBeInTheDocument();
  });

  it("says so when there are no themes", () => {
    render(<ManagedDeploymentRisks data={{ ...data, themes: [] }} />);
    expect(screen.getByText(/No open risks in Managed Services registers/)).toBeInTheDocument();
  });
});
