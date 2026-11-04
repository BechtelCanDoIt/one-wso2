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
import type { BundleChild } from "@features/sales/cado2/quotes/api/quoteTypes";
import { asksTheAm, missingChoices, NO_PICKS, pickedChildren, picksFrom } from "./bundlePicks";

const child = (id: string, addMode: BundleChild["addMode"], choiceName: string | null = null) =>
  ({ id, name: id, addMode, choiceName, fixedQuantity: null, pricebookEntries: [] }) as unknown as BundleChild;
const bundle = [
  child("LIC", "ALWAYS"),
  child("ENT", "CHOOSE_ONE", "Support tier"),
  child("PREM", "CHOOSE_ONE", "Support tier"),
  child("S", "CHOOSE_ONE", "Size"),
  child("L", "CHOOSE_ONE", "Size"),
  child("TRAIN", "OPTIONAL"),
];

// D131: the AM's picks from a bundle.
describe("bundlePicks", () => {
  it("asks only when there's a choice or an optional product", () => {
    expect(asksTheAm(bundle)).toBe(true);
    expect(asksTheAm([child("LIC", "ALWAYS"), child("OLD", undefined)])).toBe(false);
  });

  it("names the choices still to make, and brings what's picked in the bundle's order", () => {
    expect(missingChoices(bundle, NO_PICKS)).toEqual(["Support tier", "Size"]);
    const picks = { choices: { "Support tier": "PREM", Size: "S" }, optional: ["TRAIN"] };
    expect(missingChoices(bundle, picks)).toEqual([]);
    expect(pickedChildren(bundle, picks).map((c) => c.id)).toEqual(["LIC", "PREM", "S", "TRAIN"]);
    expect(pickedChildren(bundle, { choices: { "Support tier": "ENT", Size: "L" }, optional: [] }).map((c) => c.id)).toEqual(["LIC", "ENT", "L"]);
  });

  it("reads an edited parent's picks from its child lines", () => {
    expect(picksFrom(bundle, ["LIC", "ENT", "L", "TRAIN"])).toEqual({ choices: { "Support tier": "ENT", Size: "L" }, optional: ["TRAIN"] });
    expect(picksFrom(bundle, ["LIC"])).toEqual(NO_PICKS);
  });
});
