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
import { fmtRange, place, plural } from "../../../model/format";
import { DateRow, ViewAll } from "../../dashboardParts";
import type { WidgetCtx } from "../types";


/** Engagements starting in the next 30 days. */
export default function EngagementsWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const e = ctx.dashboard?.engagements;
  if (!e) return null;
  return (
    <>
      {e.startingSoon.slice(0, 6).map((x) => (
        <DateRow
          key={x.id}
          date={x.start}
          title={x.kind === "customer" ? x.account : x.title}
          lines={[x.kind === "customer" ? x.title : x.typeName, `${place(x.country, x.city)}, ${fmtRange(x.start, x.end)}`]}
          right={<Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>{x.consultantCount ? plural(x.consultantCount, "consultant") : "No consultants yet"}</Typography>}
          to={engagementPaths.engagement(x.id)}
        />
      ))}
      {e.total > 6 ? (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
          <ViewAll to={engagementPaths.engagements()} />
        </Box>
      ) : null}
    </>
  );
}
