
import type { JSX } from "react";
import { Box } from "@wso2/oxygen-ui";
import { n0 } from "../../../model/format";
import { HBars, Kpi, KpiRow, MonthColumns } from "../../dashboardParts";
import { Block } from "../parts";
import type { WidgetCtx } from "../types";

/** Travel: trips in progress, starting soon, and how travel has moved over the year. */
export default function TravelWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const t = ctx.dashboard?.travel;
  if (!t) return null;
  return (
    <>
      <KpiRow>
        <Kpi label="Trips In Progress" value={n0(t.inProgress)} note="Travelling today" />
        <Kpi label="Starting in 30 Days" value={n0(t.startingIn30Days)} />
        <Kpi label="Completed This Month" value={n0(t.completedThisMonth)} />
        <Kpi label="Trips in 12 Months" value={n0(t.tripsIn12Months)} />
      </KpiRow>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mt: 2.5 }}>
        <Block title="Top Destinations">
          <HBars rows={t.topDestinations} max={6} />
        </Block>
        <Block title="Trips by Travel Agent">
          <HBars rows={t.byTravelAgent} percent />
        </Block>
      </Box>
      <Box sx={{ mt: 2.5 }}>
        <Block title="Trips by Month">
          <MonthColumns rows={t.byMonth} name="Trips" />
        </Block>
      </Box>
    </>
  );
}
