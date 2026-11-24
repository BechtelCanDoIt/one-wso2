
import type { JSX } from "react";
import { MonthColumns, HBars } from "../../dashboardParts";
import type { WidgetCtx } from "../types";

const acct = (ctx: WidgetCtx) => ctx.dashboard?.accountManager;


/** The person's engagements by status. */
export function ByStatusWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const a = acct(ctx);
  if (!a) return null;
  return <HBars rows={a.byStatus} percent />;
}

/** The person's engagements by start month, the current month and the next five. */
export function ByMonthWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const a = acct(ctx);
  if (!a) return null;
  return <MonthColumns rows={a.byMonth} name="Engagements" />;
}
