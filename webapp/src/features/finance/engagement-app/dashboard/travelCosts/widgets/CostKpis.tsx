
import type { JSX } from "react";
import { n0 } from "../../../model/format";
import { Kpi, KpiRow } from "../../dashboardParts";
import type { WidgetCtx } from "../../widgets/types";
import { deltaText, deltaTone, usd0 } from "../costFormat";


/** Travel Cost Summary: total, trips, average per trip, travellers and the spend with no job number. */
export default function CostKpis({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const data = ctx.cost.query.data;
  if (!data) return null;
  const compared = Boolean(data.compare);
  const k = data.kpis;
  return (
    <KpiRow>
      <Kpi label="Total Travel Cost" value={usd0(k.total.value)} delta={deltaText(k.total, compared)} deltaTone={deltaTone(k.total, compared, "spend")} />
      <Kpi label="Trips" value={n0(k.trips.value)} delta={deltaText(k.trips, compared)} deltaTone={deltaTone(k.trips, compared, "volume")} />
      <Kpi label="Average per Trip" value={usd0(k.averagePerTrip.value)} delta={deltaText(k.averagePerTrip, compared)} deltaTone={deltaTone(k.averagePerTrip, compared, "spend")} />
      <Kpi label="Travellers" value={n0(k.travellers.value)} delta={deltaText(k.travellers, compared)} deltaTone={deltaTone(k.travellers, compared, "volume")} />
      <Kpi
        label="Spend Without a Job Number"
        value={usd0(k.unlinkedSpend.value)}
        note={k.unlinkedSpend.value ? "Open the lines" : undefined}
        delta={deltaText(k.unlinkedSpend, compared)}
        deltaTone={deltaTone(k.unlinkedSpend, compared, "spend")}
        onClick={k.unlinkedSpend.value ? () => ctx.cost.drill("tcUnlinked", "1") : undefined}
        actionLabel={`Spend Without a Job Number, ${usd0(k.unlinkedSpend.value)}. Show only these lines.`}
      />
    </KpiRow>
  );
}
