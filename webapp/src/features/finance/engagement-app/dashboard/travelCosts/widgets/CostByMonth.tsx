
import type { JSX } from "react";
import type { CostMonth } from "../../../api/dashboardTypes";
import EaTable, { type Column } from "../../../components/EaTable";
import { fmtMonth } from "../../../model/format";
import { StackedMonths } from "../../dashboardParts";
import type { WidgetCtx } from "../../widgets/types";
import { usd2 } from "../costFormat";
import { COST_SOURCE_LABEL } from "../../travelCostText";

const ORDER = ["invoice", "perDiem", "card", "claim"] as const;


const total = (m: CostMonth): number => Object.values(m.values).reduce((s, v) => s + v, 0);

/** Spend by month, stacked by source, or one row per month with a column per source. */
export default function CostByMonth({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const data = ctx.cost.query.data;
  if (!data) return null;
  // Only the sources this person may see, and that the range has any figure for.
  const present = ORDER.filter((s) => data.byMonth.some((m) => COST_SOURCE_LABEL[s] in m.values));
  if (ctx.cost.view.mode === "tables") {
    const columns: Column<CostMonth>[] = [
      { key: "month", label: "Month", render: (m) => fmtMonth(m.month) },
      ...present.map((s): Column<CostMonth> => ({ key: s, label: COST_SOURCE_LABEL[s], align: "right", render: (m) => usd2(m.values[COST_SOURCE_LABEL[s]] ?? 0) })),
      { key: "total", label: "Total", align: "right", render: (m) => usd2(total(m)) },
    ];
    return <EaTable ariaLabel="Travel cost by month" columns={columns} rows={data.byMonth} rowKey={(m) => m.month} empty={null} bare />;
  }
  const rows = data.byMonth.map((m) => ({ month: fmtMonth(m.month), ...Object.fromEntries(present.map((s) => [s, m.values[COST_SOURCE_LABEL[s]] ?? 0])) }));
  return <StackedMonths rows={rows} series={present.map((s) => ({ key: s, name: COST_SOURCE_LABEL[s] }))} />;
}
