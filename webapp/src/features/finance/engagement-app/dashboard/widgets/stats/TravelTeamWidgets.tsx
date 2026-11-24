
import type { JSX } from "react";
import { n0, plural } from "../../../model/format";
import { HBars, Kpi, KpiRow } from "../../dashboardParts";
import type { WidgetCtx } from "../types";

const team = (ctx: WidgetCtx) => ctx.dashboard?.travelTeam;


/** Travel Team at a Glance: who is away, trips that ended without being completed, and the PO queue. */
export function TravelTeamGlanceWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const t = team(ctx);
  if (!t) return null;
  return (
    <KpiRow>
      <Kpi label="Away This Week" value={n0(t.awayThisWeek.travellers)} note={`${plural(t.awayThisWeek.countries, "country", "countries")}`} />
      <Kpi label="Ended, Not Completed" value={n0(t.endedNotCompleted)} note="Ended 3 to 90 days ago" />
      <Kpi label="Invoices Awaiting PO Approval" value={n0(t.poQueue.count)} note={t.poQueue.count ? `Oldest ${plural(t.poQueue.oldestDays, "day")}` : "Nothing waiting"} />
    </KpiRow>
  );
}

/** Invoices awaiting PO approval, by how long they have waited. The order is the age order, not the size. */
export function PoAgeWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const t = team(ctx);
  if (!t) return null;
  return <HBars rows={t.poQueue.byAge} sort={false} max={4} />;
}

/** Frequent travellers: trips started in the last 12 months. */
export function FrequentTravellersWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const t = team(ctx);
  if (!t) return null;
  return <HBars rows={t.frequentTravellers.map((f) => ({ label: f.traveller.name, count: f.trips }))} format={(n) => plural(n, "trip")} />;
}

/** Trips under way or starting within 60 days, by travel agent. */
export function AgentWorkloadWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const t = team(ctx);
  if (!t) return null;
  return <HBars rows={t.agentWorkload} max={5} />;
}

