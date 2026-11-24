
import type { JSX } from "react";
import { usdShort } from "../../../model/format";
import { n0 } from "../../../model/format";
import { Kpi, KpiRow } from "../../dashboardParts";
import type { WidgetCtx } from "../../widgets/types";
import { deltaText } from "../costFormat";


/** Travel Cost Summary: total, trips, average per trip, travellers and the spend with no job number. */
export default function CostKpis({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const data = ctx.cost.query.data;
  if (!data) return null;
  const compared = Boolean(data.compare);
  const k = data.kpis;
  return (
    <KpiRow>
      <Kpi label="Total Travel Cost" value={usdShort(k.total.value)} delta={deltaText(k.total, compared)} />
      <Kpi label="Trips" value={n0(k.trips.value)} delta={deltaText(k.trips, compared)} />
      <Kpi label="Average per Trip" value={usdShort(k.averagePerTrip.value)} delta={deltaText(k.averagePerTrip, compared)} />
      <Kpi label="Travellers" value={n0(k.travellers.value)} delta={deltaText(k.travellers, compared)} />
      <Kpi
        label="Spend Without a Job Number"
        value={usdShort(k.unlinkedSpend.value)}
        note={k.unlinkedSpend.value ? "Open the lines" : undefined}
        delta={deltaText(k.unlinkedSpend, compared)}
        onClick={k.unlinkedSpend.value ? () => ctx.cost.drill("tcUnlinked", "1") : undefined}
        actionLabel={`Spend Without a Job Number, ${usdShort(k.unlinkedSpend.value)}. Show only these lines.`}
      />
    </KpiRow>
  );
}
