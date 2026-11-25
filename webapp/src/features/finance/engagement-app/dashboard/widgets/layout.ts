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

import type { WidgetDef } from "./types";

/** One row of the dashboard: the controls bar, a full-width widget, or a run of half-width ones. */
export type LayoutBlock =
  | { readonly kind: "controls" }
  | { readonly kind: "full"; readonly def: WidgetDef }
  | { readonly kind: "halves"; readonly defs: readonly WidgetDef[] };

/** Lays out widgets in the order given: full widgets alone, consecutive half widgets side by side, and the Travel Costs controls once above the first Travel Costs widget. */
export function layoutBlocks(defs: readonly WidgetDef[]): LayoutBlock[] {
  const blocks: LayoutBlock[] = [];
  let controls = false;
  for (const def of defs) {
    if (def.group === "travelCosts" && !controls) {
      blocks.push({ kind: "controls" });
      controls = true;
    }
    if (def.size === "full") {
      blocks.push({ kind: "full", def });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last?.kind === "halves") blocks[blocks.length - 1] = { kind: "halves", defs: [...last.defs, def] };
    else blocks.push({ kind: "halves", defs: [def] });
  }
  return blocks;
}
