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
import type { ApprovalGroup, ApprovalMapping } from "@features/sales/cado2/approvals/api/approvalTypes";
import { changedRows, mappingShort, matrixRows, percent } from "./matrixGrid";

const ladder = (am: string, rd: string, gm: string, cro: string) => [
  { role: "ACCOUNT_MANAGER", maxPercent: am },
  { role: "REGIONAL_DIRECTOR", maxPercent: rd },
  { role: "AREA_GM", maxPercent: gm },
  { role: "CRO", maxPercent: cro },
  { role: "CFO", maxPercent: null },
];
const onPremApi: ApprovalGroup = { code: "ONPREM_API", name: "API Management", ladder: ladder("5", "7", "10", "12"), reviewers: [] };
const extended: ApprovalGroup = {
  code: "EXTENDED_SUPPORT",
  name: "Extended Support (after EOL)",
  ladder: ladder("5", "8", "10", "15"),
  reviewers: ["FIELD_ENGINEERING", "SUPPORT"],
};
const rule = (classification: string, productUnit: string, groupCode: string): ApprovalMapping => ({
  kind: "RULE",
  products: [],
  skuPattern: "",
  classification,
  productUnit,
  groupCode,
});
const matrix = { groups: [onPremApi, extended], mappings: [rule("PS", "APIM", "ONPREM_API"), rule("EL", "", "EXTENDED_SUPPORT")] };
const text = (row: { cells: readonly { text: string }[] }) => row.cells.map((c) => c.text);

describe("matrixRows", () => {
  it("lays a group out like the sheet", () => {
    const [api, ext] = matrixRows(matrix);
    expect(api.products).toEqual(["PS + APIM"]);
    //                    AM    Legal  FE     Supp.  Eng.   DD     RD    AGM    CRO    CoS    CFO          CEO
    expect(text(api)).toEqual(["5%", "N/A", "N/A", "N/A", "N/A", "All", "7%", "10%", "12%", "N/A", "Above 12%", "N/A"]);
    expect(text(ext).slice(0, 6)).toEqual(["5%", "N/A", "All", "All", "N/A", "All"]);
    expect(ext.products).toEqual(["EL (any unit)"]);
    expect(api.isNew).toBe(false);
  });

  it("marks unsaved changes with the saved text", () => {
    const edited = {
      groups: [{ ...onPremApi, ladder: ladder("5", "7.5", "10", "12") }, extended],
      mappings: [rule("PS", "APIM", "EXTENDED_SUPPORT"), rule("EL", "", "EXTENDED_SUPPORT")],
    };
    const [api, ext] = matrixRows(edited, matrix);
    expect(api.cells[6]).toMatchObject({ text: "7.5%", was: "7%" });
    expect(api.cells[0].was).toBeUndefined();
    expect(api.products).toEqual([]);
    expect(api.productsWas).toEqual(["PS + APIM"]);
    expect(ext.products).toEqual(["PS + APIM", "EL (any unit)"]);
    expect(changedRows([api, ext])).toBe(2);
    expect(changedRows(matrixRows(matrix, matrix))).toBe(0);
  });

  it("marks a group added since the save", () => {
    const added = { ...matrix, groups: [...matrix.groups, { ...onPremApi, code: "NEW_GROUP", name: "New" }] };
    expect(matrixRows(added, matrix)[2].isNew).toBe(true);
  });
});

describe("labels", () => {
  it("writes limits and mappings briefly", () => {
    expect(percent("5.00")).toBe("5%");
    expect(percent("7.5")).toBe("7.5%");
    expect(percent("")).toBe("%");
    expect(mappingShort({ ...rule("", "Moesif", "X") })).toBe("Moesif (any classification)");
    expect(mappingShort({ ...rule("", "", "X"), kind: "SKU", skuPattern: "C-OC-M*" })).toBe("SKU C-OC-M*");
    const p = { id: "01t1", name: "Private Cloud - IAM", code: "C-IAM-PRIVATECLOUD" };
    expect(mappingShort({ ...rule("", "", "X"), kind: "PRODUCTS", products: [p] })).toBe("Private Cloud - IAM");
    expect(mappingShort({ ...rule("", "", "X"), kind: "PRODUCTS", products: [p, p] })).toBe("2 products");
  });
});
