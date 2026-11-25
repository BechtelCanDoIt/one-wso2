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
import { engagementPaths } from "../../../engagementPaths";
import { n0 } from "../../../model/format";
import { Calm, HBars, Kpi, ViewAll } from "../../dashboardParts";
import type { WidgetCtx } from "../types";

/** Available consultants: who has no engagement allocation in the next two weeks. */
export default function AvailableConsultantsWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const a = ctx.dashboard?.available;
  if (!a) return null;
  const pool = a.available + a.allocated;
  return (
    <>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 2 }}>
        <Kpi label="Available" value={n0(a.available)} note="No engagement allocation in the next two weeks" />
        <Kpi label="Allocated" value={n0(a.allocated)} note={`${pool ? Math.round((a.allocated / pool) * 100) : 0}% of ${n0(pool)} ${pool === 1 ? "consultant" : "consultants"}`} />
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary", mb: 1 }}>Available by Business Unit</Typography>
      {a.byBusinessUnit.length ? <HBars rows={a.byBusinessUnit} /> : <Calm>Everyone has an engagement allocation in the next two weeks.</Calm>}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
        <ViewAll to={engagementPaths.allocations("team")} />
      </Box>
    </>
  );
}
