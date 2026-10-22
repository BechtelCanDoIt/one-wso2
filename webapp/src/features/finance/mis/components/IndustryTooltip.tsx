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

import { Box, useTheme } from "@wso2/oxygen-ui";
import { misHeadlineAmount } from "../util/misMoney";
import { nonZeroEntries, tooltipSurface, type TooltipEntry } from "./industryTooltipModel";

// The card over a stacked industry bar: the industry, then one row per region
// that holds ARR in it.

export interface IndustryTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly TooltipEntry[];
}

export default function IndustryTooltip({ active, label, payload = [] }: IndustryTooltipProps) {
  const { palette } = useTheme();
  if (!active) return null;
  return (
    <div role="tooltip" style={tooltipSurface(palette)}>
      <Box sx={{ fontWeight: 700, mb: 0.5 }}>{label}</Box>
      {nonZeroEntries(payload).map((entry) => (
        <Box key={entry.name} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            aria-hidden
            component="span"
            sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: entry.color }}
          />
          <span>{entry.name}</span>
          <Box component="span" sx={{ ml: "auto", pl: 1.5, fontVariantNumeric: "tabular-nums" }}>
            {misHeadlineAmount(Number(entry.value))}
          </Box>
        </Box>
      ))}
    </div>
  );
}
