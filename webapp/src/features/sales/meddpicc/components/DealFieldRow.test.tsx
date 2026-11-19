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

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { EMPTY_DRAFT } from "../util/approval";
import { field } from "../util/callInsight.fixtures";
import DealFieldRow from "./DealFieldRow";

function renderRow(overrides: Parameters<typeof field>[0]) {
  render(
    <MemoryRouter>
      <DealFieldRow
        field={field(overrides)}
        draft={EMPTY_DRAFT}
        readOnly={false}
        salesforceUrl="https://sf/006D"
        onEdit={() => {}}
        onUndo={() => {}}
        onRoleMatch={() => {}}
        onNewContact={() => {}}
        onExplain={() => {}}
        accountName="Brightwater Pumps Limited"
      />
    </MemoryRouter>,
  );
}

const heard = { value: "Ingrid Solberg", rationale: null, confidence: 0.86, evidence: [], pending: false };

describe("DealFieldRow's decision line", () => {
  // Only when Salesforce holds the same value: an approved suggestion stays "not pending"
  // after Salesforce is changed, so not pending alone says nothing about agreement.
  it("says the calls agree with an approved suggestion Salesforce still holds", () => {
    renderRow({ salesforceValue: "Ingrid Solberg", proposal: heard, state: "FILLED" });
    expect(screen.getByText("Salesforce:")).toBeInTheDocument();
    expect(screen.getByText("· the calls agree")).toBeInTheDocument();
  });

  it("says what the calls heard once Salesforce holds something else", () => {
    renderRow({ salesforceValue: "Lars Haugen", proposal: heard, state: "FILLED" });
    expect(screen.getByText("Lars Haugen")).toBeInTheDocument();
    expect(screen.queryByText("· the calls agree")).not.toBeInTheDocument();
    expect(screen.getByText("· the calls heard Ingrid Solberg")).toBeInTheDocument();
  });

  it("keeps a field not in Salesforce yet in Echo, with nothing to compare", () => {
    renderRow({ notInSalesforce: true, proposal: heard, state: "FILLED" });
    expect(screen.queryByText("In Salesforce")).not.toBeInTheDocument();
    expect(screen.getByText("Kept in Echo:")).toBeInTheDocument();
    expect(screen.getByText("· the calls agree")).toBeInTheDocument();
  });

  it("leads a pending suggestion with Salesforce beside what the calls heard, marked as Echo's", () => {
    renderRow({});
    expect(screen.getByText("In Salesforce")).toBeInTheDocument();
    expect(screen.getByText("Heard on calls")).toBeInTheDocument();
    expect(screen.getByText("Echo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Where .* came from$/ })).toBeInTheDocument();
    expect(screen.queryByText(/matches Salesforce/)).not.toBeInTheDocument();
  });
});
