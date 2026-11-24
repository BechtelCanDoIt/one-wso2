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
import type { ImportLine, Product } from "@features/sales/cado2/quotes/api/quoteTypes";
import { importedLine, importPrefill } from "./opportunityImport";

const product = (recurring: boolean): Product => ({
  id: "01tA", name: "WSO2 Integrator", productCode: "C-INT", description: null, family: null, unitOfMeasure: "Per core",
  productUnit: null, classification: "PS", category: recurring ? "SUBSCRIPTION" : "PROFESSIONAL_SERVICE", recurring,
  classificationProblem: null,
  pricebookEntries: [{ id: "01uA", unitPrice: "18000", currencyIsoCode: "USD", isActive: true, pricebook: { id: "01sA", name: "FY26 USD" } }],
});
const sfLine = (over: Partial<ImportLine> = {}): ImportLine => ({
  id: "00kA", productName: "WSO2 Integrator", productCode: "C-INT", quantity: "4", salesPrice: "18630.00", discount: "15",
  commissionPercent: "10", totalPrice: null, serviceStartDate: "2027-03-01", serviceEndDate: "2027-05-31",
  status: "READY", reason: null, product: product(true), ...over,
});
const year = { number: 1, start: "2027-01-01", end: "2027-12-31" };

describe("importPrefill (D178)", () => {
  it("brings Salesforce's quantity, discount and a sales price other than the list price", () => {
    expect(importPrefill(sfLine(), year, false)).toMatchObject({ quantity: "4", discount: "15", salesPrice: "18630", startDate: "", endDate: "" });
  });

  it("drops a sales price equal to the list price, and any on a formula line", () => {
    expect(importPrefill(sfLine({ salesPrice: "18000" }), year, false)?.salesPrice).toBe("");
    expect(importPrefill(sfLine(), year, true)?.salesPrice).toBe("");
  });

  it("keeps a one-off line's dates inside the year, else takes the year's", () => {
    const ps = product(false);
    expect(importPrefill(sfLine({ product: ps }), year, false)).toMatchObject({ startDate: "2027-03-01", endDate: "2027-05-31" });
    expect(importPrefill(sfLine({ product: ps, serviceEndDate: "2028-02-28" }), year, false)).toMatchObject({
      startDate: "2027-01-01", endDate: "2027-12-31",
    });
    expect(importPrefill(sfLine({ product: ps, serviceStartDate: null }), year, false)).toMatchObject({ startDate: "2027-01-01" });
    expect(importPrefill(sfLine({ product: ps }), { number: 1, start: "", end: "" }, false)).toMatchObject({ startDate: "", endDate: "" });
  });

  it("is null without a product in the price book; no discount is 0", () => {
    expect(importPrefill(sfLine({ product: null }), year, false)).toBeNull();
    expect(importPrefill(sfLine({ discount: null }), year, false)?.discount).toBe("0");
  });
});

describe("importedLine (D178)", () => {
  it("is the quote's new line in the year, priced from the book, with Salesforce's values", () => {
    const line = importedLine(importPrefill(sfLine(), year, false)!, year, "Per core");
    expect(line).toMatchObject({
      lineId: null, pricebookEntryId: "01uA", productId: "01tA", unitPrice: "18000", category: "SUBSCRIPTION", recurring: true,
      unitOfMeasure: "Per core", quantity: "4", discount: "15", salesPrice: "18630", yearNumber: 1,
    });
  });
});
