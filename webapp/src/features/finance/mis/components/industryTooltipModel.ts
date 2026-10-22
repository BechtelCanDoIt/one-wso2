/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import type { CSSProperties } from "react";
import type { Theme } from "@wso2/oxygen-ui";

export interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
}

/** The series that have a figure for the hovered bar; a $0 row says nothing. */
export function nonZeroEntries<T extends TooltipEntry>(entries: readonly T[]): T[] {
  return entries.filter((entry) => Number(entry.value) !== 0);
}

// Oxygen's acrylic themes give `background.paper` an alpha channel, which lets
// the bars show through the card and swallows its title. `background.default`
// is opaque in every theme this app offers.
export function tooltipSurface({ background, divider, text }: Theme["palette"]): CSSProperties {
  return {
    background: background.default,
    border: `1px solid ${divider}`,
    borderRadius: 6,
    color: text.primary,
    fontSize: 12,
    padding: "8px 10px",
  };
}
