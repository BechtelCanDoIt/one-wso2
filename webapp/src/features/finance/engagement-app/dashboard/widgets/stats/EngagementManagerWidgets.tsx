
import type { JSX } from "react";
import { Box, Typography } from "@wso2/oxygen-ui";
import { engagementPaths } from "../../../engagementPaths";
import { Status } from "../../../components/StatusChips";
import { fmtRange, n0, place, plural } from "../../../model/format";
import type { DashboardEngagement } from "../../../api/dashboardTypes";
import { DateRow, HBars, ViewAll } from "../../dashboardParts";
import type { WidgetCtx } from "../types";

const mgr = (ctx: WidgetCtx) => ctx.dashboard?.engagementManager;
const acct = (ctx: WidgetCtx) => ctx.dashboard?.accountManager;



/** "Showing 6 of 8", and the full list a click away. */
function More({ shown, total, to }: { shown: number; total: number; to: string }): JSX.Element | null {
  if (total <= shown) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Showing {n0(shown)} of {n0(total)}
      </Typography>
      <ViewAll to={to} />
    </Box>
  );
}

function EngagementList({ items, total, to }: { items: readonly DashboardEngagement[]; total: number; to: string }): JSX.Element {
  return (
    <>
      {items.map((x) => (
        <DateRow
          key={x.id}
          date={x.start}
          title={x.kind === "customer" ? x.account || x.title : x.title}
          lines={[x.kind === "customer" ? x.title : x.typeName, `${place(x.country, x.city)}, ${fmtRange(x.start, x.end)}`]}
          right={<Status label="No consultants" tone="warning" />}
          to={engagementPaths.engagement(x.id)}
        />
      ))}
      <More shown={items.length} total={total} to={to} />
    </>
  );
}

/** Engagements starting in the next 30 days with nobody allocated. */
export function WithoutConsultantsWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const m = mgr(ctx);
  if (!m) return null;
  return <EngagementList items={m.withoutConsultants.items} total={m.withoutConsultants.total} to={engagementPaths.engagements()} />;
}

/** Allocations that start in the next 14 days. */
export function StartingIn14Widget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const m = mgr(ctx);
  if (!m) return null;
  const s = m.startingIn14Days;
  return (
    <>
      {s.items.map((a) => (
        <DateRow
          key={a.allocationId}
          date={a.start}
          title={a.consultant.name}
          lines={[a.engagementTitle, fmtRange(a.start, a.end)]}
          right={a.travelRequired ? <Status label="Travel required" tone="info" /> : undefined}
          to={engagementPaths.engagement(a.engagementId)}
        />
      ))}
      <More shown={s.items.length} total={s.total} to={engagementPaths.allocations()} />
    </>
  );
}

/** Consultants with the most allocated days in the last 90 days. */
export function MostAllocatedWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const m = mgr(ctx);
  if (!m) return null;
  return <HBars rows={m.mostAllocated.map((x) => ({ label: x.consultant.name, count: x.days }))} format={(n) => plural(n, "day")} />;
}

/** Customers (or countries, when the person allocates no customer type) by allocated days over 12 months. */
export function TopCustomersWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const m = mgr(ctx);
  if (!m) return null;
  return <HBars rows={m.topCustomers.items} format={(n) => plural(n, "day")} />;
}

/** Account Manager: engagements the person created that have started with nobody allocated. */
export function StartedWithoutConsultantsWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const a = acct(ctx);
  if (!a) return null;
  return <EngagementList items={a.startedWithoutConsultants.items} total={a.startedWithoutConsultants.total} to={engagementPaths.engagements()} />;
}
