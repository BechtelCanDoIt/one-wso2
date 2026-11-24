
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
