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

// The AM's picks from a bundle with choices and optional products (D131).

import type { BundleChild } from "@features/sales/cado2/quotes/api/quoteTypes";

/** What the AM picked: one product per named choice, and the optional ones ticked. */
export interface BundlePicksValue {
  readonly choices: Readonly<Record<string, string>>;
  readonly optional: readonly string[];
}

export const NO_PICKS: BundlePicksValue = { choices: {}, optional: [] };

/** The bundle's choices, in the bundle's order: name → its products. */
export function bundleChoices(children: readonly BundleChild[]): Map<string, BundleChild[]> {
  const out = new Map<string, BundleChild[]>();
  for (const c of children) {
    if (c.addMode !== "CHOOSE_ONE") continue;
    const name = c.choiceName ?? "";
    out.set(name, [...(out.get(name) ?? []), c]);
  }
  return out;
}

/** Whether the bundle asks the AM anything: a choice or an optional product (D131). */
export const asksTheAm = (children: readonly BundleChild[]) => children.some((c) => c.addMode === "CHOOSE_ONE" || c.addMode === "OPTIONAL");

/** The choices still to make, by name. */
export const missingChoices = (children: readonly BundleChild[], picks: BundlePicksValue) =>
  [...bundleChoices(children).keys()].filter((name) => !picks.choices[name]);

/** The children the picks bring, in the bundle's order: always-included, the picked one per choice, the ticked optional ones. */
export const pickedChildren = (children: readonly BundleChild[], picks: BundlePicksValue) =>
  children.filter((c) =>
    c.addMode === "CHOOSE_ONE" ? picks.choices[c.choiceName ?? ""] === c.id : c.addMode === "OPTIONAL" ? picks.optional.includes(c.id) : true,
  );

/** The picks a parent's current child lines amount to (editing a parent). */
export function picksFrom(children: readonly BundleChild[], productIds: readonly string[]): BundlePicksValue {
  const choices: Record<string, string> = {};
  const optional: string[] = [];
  for (const c of children) {
    if (!productIds.includes(c.id)) continue;
    if (c.addMode === "CHOOSE_ONE") choices[c.choiceName ?? ""] ??= c.id;
    else if (c.addMode === "OPTIONAL") optional.push(c.id);
  }
  return { choices, optional };
}
