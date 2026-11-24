
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
