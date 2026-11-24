
import type { TravelCosts } from "../../api/dashboardTypes";
import { fmtDate } from "../../model/format";
import type { WidgetCtx } from "./types";

// When each widget is empty, and the headings and notes that depend on its data. Pure, so a test can run them without drawing anything.

const team = (ctx: WidgetCtx) => ctx.dashboard?.travelTeam;
const mgr = (ctx: WidgetCtx) => ctx.dashboard?.engagementManager;
const acct = (ctx: WidgetCtx) => ctx.dashboard?.accountManager;
const ev = (ctx: WidgetCtx) => ctx.dashboard?.marketingEvents;

export const myWorkEmpty = (ctx: WidgetCtx): boolean => !ctx.dashboard?.myWork;
export const waitingEmpty = (ctx: WidgetCtx): boolean => !ctx.dashboard?.queue?.length;
export const waitingNote = (ctx: WidgetCtx): string | undefined => {
  const q = ctx.dashboard?.queue ?? [];
  return q.length && q.some((t) => t.count) ? "Open a tile to work through the list." : undefined;
};
export const engagementsEmpty = (ctx: WidgetCtx): boolean => !ctx.dashboard?.engagements?.startingSoon.length;
export const overTimeEmpty = (ctx: WidgetCtx): boolean => !ctx.dashboard?.allocationsOverTime?.byMonth.some((m) => m.value > 0);

export const allocationsTodayHeading = (ctx: WidgetCtx): string =>
  ctx.allocationsToday.date ? `Allocations on ${fmtDate(ctx.allocationsToday.query.data?.date ?? ctx.allocationsToday.date)}` : "Allocations Today";
export const allocationsTodayNote = (ctx: WidgetCtx): string => {
  const on = ctx.allocationsToday.query.data?.date ?? (ctx.allocationsToday.date || ctx.today);
  return `Everyone allocated on ${fmtDate(on)}${ctx.allocationsToday.businessUnit ? ` in ${ctx.allocationsToday.businessUnit}` : ", across every business unit"}.`;
};

export const poAgeEmpty = (ctx: WidgetCtx): boolean => !team(ctx)?.poQueue?.count;
export const frequentEmpty = (ctx: WidgetCtx): boolean => !team(ctx)?.frequentTravellers?.length;
export const workloadEmpty = (ctx: WidgetCtx): boolean => !team(ctx)?.agentWorkload?.length;

export const withoutConsultantsEmpty = (ctx: WidgetCtx): boolean => !mgr(ctx)?.withoutConsultants?.total;
export const starting14Empty = (ctx: WidgetCtx): boolean => !mgr(ctx)?.startingIn14Days?.total;
export const mostAllocatedEmpty = (ctx: WidgetCtx): boolean => !mgr(ctx)?.mostAllocated?.length;
export const topCustomersEmpty = (ctx: WidgetCtx): boolean => !mgr(ctx)?.topCustomers?.items.length;
export const topCustomersHeading = (ctx: WidgetCtx): string => (mgr(ctx)?.topCustomers?.by === "country" ? "Top Countries by Allocated Days" : "Top Customers by Allocated Days");

export const startedWithoutEmpty = (ctx: WidgetCtx): boolean => !acct(ctx)?.startedWithoutConsultants?.total;
export const byStatusEmpty = (ctx: WidgetCtx): boolean => !acct(ctx)?.byStatus?.length;
export const accountByMonthEmpty = (ctx: WidgetCtx): boolean => !acct(ctx)?.byMonth?.some((m) => m.value > 0);

export const eventsByMonthEmpty = (ctx: WidgetCtx): boolean => !ev(ctx)?.byMonth?.some((m) => m.value > 0);
export const eventsByRegionEmpty = (ctx: WidgetCtx): boolean => !ev(ctx)?.byRegion?.length;
export const fundingEmpty = (ctx: WidgetCtx): boolean => !ev(ctx)?.fundingByBusinessUnit?.length;
export const campaignEmpty = (ctx: WidgetCtx): boolean => !ev(ctx)?.campaignCoverage?.total;

// Whether the part a role widget reads came back. The backend leaves out a part the caller may not see.
export const PRESENT = {
  "tt-glance": (ctx: WidgetCtx): boolean => Boolean(team(ctx)?.awayThisWeek && team(ctx)?.endedNotCompleted !== undefined && team(ctx)?.poQueue),
  "tt-po-age": (ctx: WidgetCtx): boolean => Boolean(team(ctx)?.poQueue?.byAge),
  "tt-frequent": (ctx: WidgetCtx): boolean => Boolean(team(ctx)?.frequentTravellers),
  "tt-agent-workload": (ctx: WidgetCtx): boolean => Boolean(team(ctx)?.agentWorkload),
  "em-no-consultants": (ctx: WidgetCtx): boolean => Boolean(mgr(ctx)?.withoutConsultants),
  "em-starting-14": (ctx: WidgetCtx): boolean => Boolean(mgr(ctx)?.startingIn14Days),
  "em-most-allocated": (ctx: WidgetCtx): boolean => Boolean(mgr(ctx)?.mostAllocated),
  "em-top-customers": (ctx: WidgetCtx): boolean => Boolean(mgr(ctx)?.topCustomers),
  "am-started-no-consultants": (ctx: WidgetCtx): boolean => Boolean(acct(ctx)?.startedWithoutConsultants),
  "am-by-status": (ctx: WidgetCtx): boolean => Boolean(acct(ctx)?.byStatus),
  "am-by-month": (ctx: WidgetCtx): boolean => Boolean(acct(ctx)?.byMonth),
  "ev-by-month": (ctx: WidgetCtx): boolean => Boolean(ev(ctx)?.byMonth),
  "ev-by-region": (ctx: WidgetCtx): boolean => Boolean(ev(ctx)?.byRegion),
  "ev-funding-bu": (ctx: WidgetCtx): boolean => Boolean(ev(ctx)?.fundingByBusinessUnit),
  "ev-campaign": (ctx: WidgetCtx): boolean => ev(ctx)?.campaignCoverage !== undefined,
} as const;

type Costs = NonNullable<WidgetCtx["cost"]["query"]["data"]>;
const LISTS = {
  source: (d: Costs) => d.bySource,
  country: (d: Costs) => d.byCountry,
  customer: (d: Costs) => d.byCustomer,
  travelAgent: (d: Costs) => d.byTravelAgent,
  costType: (d: Costs) => d.byCostType,
  paid: (d: Costs) => d.byPaid,
} as const satisfies Record<string, (d: TravelCosts) => readonly { value: number }[]>;

export type CostDimension = keyof typeof LISTS;

/** The buckets of one dimension of the summary. */
export const costBuckets = <K extends CostDimension>(dimension: K, d: Costs): ReturnType<(typeof LISTS)[K]> => LISTS[dimension](d) as ReturnType<(typeof LISTS)[K]>;

export const kpisEmpty = (ctx: WidgetCtx): boolean => {
  const k = ctx.cost.query.data?.kpis;
  return !k || (k.total.value === 0 && k.trips.value === 0);
};
export const barsEmpty =
  (dimension: CostDimension) =>
  (ctx: WidgetCtx): boolean => {
    const d = ctx.cost.query.data;
    return !d || !LISTS[dimension](d).some((b) => b.value !== 0);
  };
export const costByMonthEmpty = (ctx: WidgetCtx): boolean => !ctx.cost.query.data?.byMonth.some((m) => Object.values(m.values).some((v) => v !== 0));
