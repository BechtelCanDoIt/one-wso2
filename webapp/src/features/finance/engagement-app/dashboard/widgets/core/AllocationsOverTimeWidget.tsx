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

import type { JSX } from "react";
import { Box, Typography } from "@wso2/oxygen-ui";
import { fmtMonth, n0 } from "../../../model/format";
import { HBars, MonthColumns } from "../../dashboardParts";
import { Block } from "../parts";
import type { WidgetCtx } from "../types";


/** New engagement allocations by start month, over the last 12 months. */
export default function AllocationsOverTimeWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const o = ctx.dashboard?.allocationsOverTime;
  if (!o) return null;
  const best = o.byMonth.reduce((m, r) => (r.value > m.value ? r : m), { month: "", value: 0 });
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 3fr) minmax(0, 2fr)" }, gap: 3 }}>
      <Block title="Allocations by Month">
        {best.month ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Busiest month <b>{fmtMonth(best.month)}</b> with <b>{n0(best.value)}</b> allocations
          </Typography>
        ) : null}
        <MonthColumns rows={o.byMonth} name="Allocations" />
      </Block>
      <Block title="Allocations by Business Unit">
        <HBars rows={o.byBusinessUnit} percent />
      </Block>
    </Box>
  );
}
