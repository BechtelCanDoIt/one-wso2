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
import { Typography } from "@wso2/oxygen-ui";
import EaTable, { type Column } from "../../../components/EaTable";
import { Two } from "../../../components/StatusChips";
import { n0 } from "../../../model/format";
import { HBars, Kpi, MonthColumns } from "../../dashboardParts";
import type { MarketingEventStats } from "../../../api/dashboardTypes";
import type { WidgetCtx } from "../types";

const ev = (ctx: WidgetCtx) => ctx.dashboard?.marketingEvents;


export function EventsByMonthWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const e = ev(ctx)?.byMonth;
  return e ? <MonthColumns rows={e} name="Events" /> : null;
}

export function EventsByRegionWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const e = ev(ctx)?.byRegion;
  return e ? <HBars rows={e} max={8} /> : null;
}

export function FundingByBusinessUnitWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const e = ev(ctx)?.fundingByBusinessUnit;
  return e ? <HBars rows={e} max={6} /> : null;
}

type Creator = NonNullable<MarketingEventStats["campaignCoverage"]>["byCreator"][number];

const COLUMNS: readonly Column<Creator>[] = [
  { key: "creator", label: "Created By", render: (c) => <Two main={c.creator.name} sub={c.creator.email} /> },
  { key: "with", label: "With Campaign ID", align: "right", render: (c) => `${n0(c.withCampaign)} of ${n0(c.total)}` },
  { key: "percent", label: "Coverage", align: "right", render: (c) => `${Math.round(c.percent)}%` },
];

/** Campaign ID coverage: how many recent marketing events carry a campaign, and who creates the ones that do not. */
export function CampaignCoverageWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const c = ev(ctx)?.campaignCoverage;
  if (!c) return null;
  return (
    <>
      <Kpi label="Events With a Campaign ID" value={`${Math.round(c.percent)}%`} note={`${n0(c.withCampaign)} of ${n0(c.total)} events since 90 days ago`} />
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary", my: 1.5 }}>By Creator</Typography>
      <EaTable ariaLabel="Campaign ID coverage by creator" columns={COLUMNS} rows={c.byCreator} rowKey={(r) => r.creator.email} empty={null} bare />
    </>
  );
}
