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

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HBars, InfoHint } from "./dashboardParts";
import { notConvertedSummary, notConvertedText, USD_RATE_HINT } from "./travelCostText";

const rows = [
  { label: "Acme Corp", count: 14 },
  { label: "Example Ltd", count: 1 },
  { label: "Contoso", count: 1 },
];

describe("HBars", () => {
  // The count and its share are separate words, so copy-paste and screen readers read "14 88%", not "1488%".
  it("separates the count from its percentage with a real space", () => {
    const { getByTitle } = render(<HBars rows={rows} percent />);
    const row = getByTitle("Acme Corp").parentElement!;
    expect(row.textContent).toContain("14 88%");
    expect(row.textContent).not.toContain("1488%");
  });

  it("shows the count alone without percent", () => {
    const { getByTitle } = render(<HBars rows={rows} />);
    const row = getByTitle("Acme Corp").parentElement!;
    expect(row.textContent?.endsWith("14")).toBe(true);
    expect(row.textContent).not.toContain("%");
  });
});

describe("notConvertedText", () => {
  it("is empty when everything converted", () => {
    expect(notConvertedText([])).toBe("");
  });

  it("names each amount, its currency and its source", () => {
    const text = notConvertedText([
      { source: "invoice", currency: "LKR", amount: 1234500 },
      { source: "card", currency: "EUR", amount: 2300 },
      { source: "claim", currency: "", amount: 15 },
    ]);
    expect(text).toBe("Not converted, left out of the totals: LKR 1,234,500 (Travel Invoices), EUR 2,300.00 (Credit Card Expenses), Unknown currency 15.00 (Expense Claims)");
    expect(text).not.toContain(";");
  });
});

describe("notConvertedSummary", () => {
  it("counts the amounts and currencies and names each source once", () => {
    const text = notConvertedSummary([
      { source: "perDiem", currency: "AED", amount: 5940 },
      { source: "claim", currency: "AED", amount: 4401.78 },
      { source: "claim", currency: "BRL", amount: 712.35 },
      { source: "claim", currency: "GBP", amount: 506.48 },
    ]);
    expect(text).toBe("Not converted, left out of the totals: 4 amounts in 3 currencies (Per Diems, Expense Claims).");
    expect(text).not.toContain(";");
  });
});

describe("InfoHint", () => {
  it("is a button with an accessible name, so the hint opens on focus", () => {
    const { getByRole } = render(<InfoHint label="How USD is calculated">{USD_RATE_HINT}</InfoHint>);
    expect(getByRole("button", { name: "How USD is calculated" })).toBeTruthy();
  });
});
