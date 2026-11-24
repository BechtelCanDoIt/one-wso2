// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import type { JSX, ReactNode } from "react";
import { Box, Skeleton, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@wso2/oxygen-ui";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import { localIsoDate } from "@utils/localDate";
import type { AllocationsToday as AllocationsTodayData, Dashboard } from "../api/engagementTypes";
import { useAllocationsToday, useDashboard, useReferenceData } from "../api/useEngagementApi";
import { useEngagementAccess } from "../api/useEngagementUserInfo";
import EaPage from "../components/EaPage";
import { Failed } from "../components/ListCard";
import { AllocationStatusChip, TravelStatusChip, Mono } from "../components/StatusChips";
import { engagementPaths } from "../engagementPaths";
import { ALLOC } from "../model/engagementAccess";
import { addDays, fmtDate, fmtMonth, fmtRange, n0, place, plural, usdShort, money } from "../model/format";
import { useListView } from "../model/useListView";
import { FilterDate, FilterSelect } from "../components/FilterFields";
import { Calm, DateRow, Grid, HBars, Kpi, KpiRow, Mini, MonthColumns, QueueTiles, Section, StackedMonths, ViewAll } from "./dashboardParts";

/** A line under each Waiting on You tile, by the backend's queue key. The label, count and list are the backend's. */
const QUEUE_HINT: Readonly<Record<string, string>> = {
  pendingApproval: "To approve",
  readyForClearance: "On the engagement types you allocate",
  newTravelRequests: "Assign a travel agent and visa",
  "approve-po": "PO Approval",
  approve: "Finance approval",
  push: "Accepted by finance",
  pay: "Pending in NetSuite",
  failed: "Re-sync with NetSuite",
};

/** Dashboard: the first screen people land on, built only from what each person's existing privileges allow. */
export default function DashboardPage(): JSX.Element {
  const access = useEngagementAccess();
  const user = useAsgardeoUser();
  const today = localIsoDate();
  const list = useListView();
  const bu = list.filters.businessUnit ?? "";
  const date = list.filters.date ?? "";
  const dashboard = useDashboard();
  const ref = useReferenceData();
  // Allocations Today has its own call (a date and a business unit), for holders of Allocations 1.
  const showToday = access.p.a.has(ALLOC.DASHBOARD) && !access.isAgent;
  const buId = bu ? ref.data?.businessUnitIds[bu] : undefined;
  const allocationsToday = useAllocationsToday({ date: date || undefined, businessUnitId: buId }, showToday && (!bu || buId !== undefined));
  const first = user.givenName ?? user.displayName?.split(" ")[0];

  if (dashboard.isPending) {
    return (
      <EaPage title="Dashboard">
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={90} />
          <Skeleton variant="rounded" height={260} />
        </Stack>
      </EaPage>
    );
  }
  if (dashboard.isError) {
    return (
      <EaPage title="Dashboard">
        <Failed what="the dashboard" error={dashboard.error} onRetry={() => void dashboard.refetch()} retrying={dashboard.isFetching} />
      </EaPage>
    );
  }
  const d = dashboard.data;
  if (d.agency) return <AgentDashboard d={d} />;

  const queue = (d.queue ?? []).map((q) => ({ key: q.key, count: q.count, label: q.label, to: q.to, hot: q.highlighted, hint: QUEUE_HINT[q.key] }));
  const financeFirst = d.travelCost?.creditCards !== undefined;
  const my = d.myWork;
  const myCards = [
    my?.allocations.length ? (
      <Mini key="allocation" title="My Allocation">
        {my.allocations.slice(0, 2).map((a) => (
          <DateRow
            key={a.id}
            date={a.start}
            title={a.title || a.engagementId}
            lines={[fmtRange(a.start, a.end)]}
            right={a.status ? <AllocationStatusChip status={a.status} /> : undefined}
          />
        ))}
      </Mini>
    ) : null,
    my?.trips.length ? (
      <Mini key="trip" title="My Next Trip">
        {my.trips.slice(0, 2).map((t) => (
          <DateRow
            key={t.jobNumber}
            date={t.start}
            title={place(t.country, t.city)}
            lines={[fmtRange(t.start, t.end), t.travelAgent ? `Travel Agent ${t.travelAgent}` : "No travel agent yet"]}
            right={t.status ? <TravelStatusChip status={t.status} /> : undefined}
          />
        ))}
      </Mini>
    ) : null,
  ].filter(Boolean);
  const failed = (key: string) => d.failed.includes(key);
  const retry = <Failed what="this section" error={null} onRetry={() => void dashboard.refetch()} retrying={dashboard.isFetching} />;
  const down = (title: string) => (
    <Section title={title} key={title}>
      {retry}
    </Section>
  );

  return (
    <EaPage
      title="Dashboard"
      subtitle={`Welcome back${first ? `, ${first}` : ""}. Here is where engagements, allocations and travel stand on ${fmtDate(today)}.`}
    >
      {myCards.length ? (
        <Section title="My Work">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: myCards.length > 1 ? "1fr 1fr" : "1fr" }, gap: 2 }}>{myCards}</Box>
        </Section>
      ) : failed("myWork") ? (
        down("My Work")
      ) : null}

      {failed("waitingOnYou") ? down("Waiting on You") : null}
      {queue.length ? (
        <Section title="Waiting on You" sub={queue.some((q) => q.count) ? "Open a tile to work through the list." : "Nothing is waiting on you right now."}>
          <QueueTiles tiles={queue} />
        </Section>
      ) : null}

      {financeFirst && d.travelCost ? <TravelCost d={d} /> : null}
      {d.travel ? <Travel d={d} /> : failed("travel") ? down("Travel") : null}
      {!financeFirst && d.travelCost ? <TravelCost d={d} /> : failed("travelCost") ? down("Travel Cost") : null}
      {d.engagements || d.available || failed("engagements") || failed("availableConsultants") ? <Engagements d={d} retry={retry} /> : null}
      {showToday ? (
        <AllocationsToday
          a={allocationsToday.data}
          failed={allocationsToday.isError ? allocationsToday.error : undefined}
          onRetry={() => void allocationsToday.refetch()}
          retrying={allocationsToday.isFetching}
          bu={bu}
          date={date}
          today={today}
          onChange={(next) => list.setFilters({ ...list.filters, ...next })}
        />
      ) : null}
      {d.allocationsOverTime ? <AllocationsOverTime d={d} /> : failed("allocationsOverTime") ? down("Allocations Over Time") : null}
    </EaPage>
  );
}

function TravelCost({ d }: { d: Dashboard }): JSX.Element {
  const c = d.travelCost!;
  const share = (n: number) => `${Math.round((n / (c.total || 1)) * 100)}% of the total`;
  const cards = c.creditCards !== undefined;
  const claims = c.expenseClaims !== undefined;
  const months = c.byMonth.map((m) => ({
    month: fmtMonth(m.month),
    invoices: m.invoices,
    perDiems: m.perDiems,
    ...(cards ? { creditCards: m.creditCards ?? 0 } : {}),
    ...(claims ? { expenseClaims: m.expenseClaims ?? 0 } : {}),
  }));
  return (
    <Section
      title="Travel Cost"
      sub={`${cards ? (claims ? "Travel invoices, per diem payments, credit card expenses and expense claims" : "Travel invoices, per diem payments and credit card expenses") : "Travel invoices and per diem payments"} in USD at month-end rates, over the last 12 months.`}
    >
      <KpiRow>
        <Kpi label="Travel Cost, 12 Months" value={usdShort(c.total)} />
        <Kpi label="Travel Invoices" value={usdShort(c.invoices)} note={share(c.invoices)} />
        <Kpi label="Per Diems" value={usdShort(c.perDiems)} note={share(c.perDiems)} />
        {cards ? <Kpi label="Credit Card Expenses" value={usdShort(c.creditCards ?? 0)} note={share(c.creditCards ?? 0)} /> : null}
        {claims ? <Kpi label="Expense Claims" value={usdShort(c.expenseClaims ?? 0)} note={share(c.expenseClaims ?? 0)} /> : null}
      </KpiRow>
      <Grid wide>
        <Mini title="Travel Cost by Month">
          <StackedMonths
            rows={months}
            series={[
              { key: "invoices", name: "Travel Invoices" },
              { key: "perDiems", name: "Per Diems" },
              ...(cards ? [{ key: "creditCards", name: "Credit Card Expenses" }] : []),
              ...(claims ? [{ key: "expenseClaims", name: "Expense Claims" }] : []),
            ]}
          />
        </Mini>
        <Mini title="Travel Cost by Type" center>
          <HBars rows={c.byType} format={usdShort} percent />
        </Mini>
      </Grid>
    </Section>
  );
}

function Travel({ d }: { d: Dashboard }): JSX.Element {
  const t = d.travel!;
  return (
    <Section title="Travel" sub="Trips in progress, what is coming up, and how travel has moved over the year.">
      <KpiRow>
        <Kpi label="Trips In Progress" value={n0(t.inProgress)} note="Travelling today" />
        <Kpi label="Starting in 30 Days" value={n0(t.startingIn30Days)} />
        <Kpi label="Completed This Month" value={n0(t.completedThisMonth)} />
        <Kpi label="Trips in 12 Months" value={n0(t.tripsIn12Months)} />
      </KpiRow>
      <Grid>
        <Mini title="Upcoming Trips" aside={t.upcomingTotal > 5 ? <ViewAll to={engagementPaths.travelRequests("in-progress")} /> : undefined}>
          {t.upcoming.length ? (
            t.upcoming.slice(0, 5).map((x) => (
              <DateRow
                key={x.jobNumber}
                date={x.start}
                title={x.traveller.name}
                lines={[`${place(x.country, x.city)}, ${fmtRange(x.start, x.end)}`, x.travelAgent || "No travel agent yet"]}
                right={
                  <>
                    {x.status ? <TravelStatusChip status={x.status} /> : null}
                    <Mono>{x.jobNumber}</Mono>
                  </>
                }
                to={engagementPaths.travelRequest(x.jobNumber)}
              />
            ))
          ) : (
            <Calm>No trips coming up.</Calm>
          )}
        </Mini>
        <Mini title="Top Destinations">
          <HBars rows={t.topDestinations} max={6} />
        </Mini>
      </Grid>
      <Grid>
        <Mini title="Trips by Month">
          <MonthColumns rows={t.byMonth} name="Trips" />
        </Mini>
        <Mini title="Trips by Travel Agent">
          <HBars rows={t.byTravelAgent} percent />
        </Mini>
      </Grid>
    </Section>
  );
}

function Engagements({ d, retry }: { d: Dashboard; retry: ReactNode }): JSX.Element | null {
  const e = d.engagements;
  const show = e ? e.startingSoon.length > 0 : d.failed.includes("engagements");
  const soon = !show ? null : (
    <Mini title="Starting in the Next 30 Days" aside={e && e.total > 6 ? <ViewAll to={engagementPaths.engagements()} /> : undefined}>
      {!e
        ? retry
        : e.startingSoon.slice(0, 6).map((x) => (
          <DateRow
            key={x.id}
            date={x.start}
            title={x.kind === "customer" ? x.account : x.title}
            lines={[x.kind === "customer" ? x.title : x.typeName, `${place(x.country, x.city)}, ${fmtRange(x.start, x.end)}`]}
            right={<Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>{x.consultantCount ? plural(x.consultantCount, "consultant") : "No consultants yet"}</Typography>}
            to={engagementPaths.engagement(x.id)}
          />
          ))}
    </Mini>
  );
  if (!d.available && !d.failed.includes("availableConsultants")) {
    if (!soon) return null;
    return (
      <Section title="Engagements" sub="What starts soon on the engagements you work with.">
        {soon}
      </Section>
    );
  }
  const a = d.available;
  const pool = a ? a.available + a.allocated || 1 : 1;
  return (
    <Section title="Engagements" sub={soon ? "What starts soon, and who is free to take it on." : "Who is free to take on new work."}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: soon ? "1fr 1fr" : "1fr" }, gap: 2, alignItems: "stretch" }}>
        {soon}
        <Mini title="Available Consultants" aside={<ViewAll to={engagementPaths.allocations("team")} />}>
          {!a ? (
            retry
          ) : (
            <>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 2 }}>
            <Kpi label="Available" value={n0(a.available)} note="No engagement allocation in the next two weeks" />
            <Kpi label="Allocated" value={n0(a.allocated)} note={`${Math.round((a.allocated / pool) * 100)}% of ${n0(pool)} consultants`} />
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary", mb: 1 }}>Available by Business Unit</Typography>
          {a.byBusinessUnit.length ? <HBars rows={a.byBusinessUnit} /> : <Calm>Everyone has an engagement allocation in the next two weeks.</Calm>}
            </>
          )}
        </Mini>
      </Box>
    </Section>
  );
}

/** Allocations Today: the legacy Allocations dashboard (privilege 1), with its Business Unit and Today / Past Date choices. */
function AllocationsToday({
  a,
  failed,
  onRetry,
  retrying,
  bu,
  date,
  today,
  onChange,
}: {
  a?: AllocationsTodayData;
  failed?: unknown;
  onRetry: () => void;
  retrying?: boolean;
  bu: string;
  date: string;
  today: string;
  onChange: (next: { businessUnit?: string; date?: string }) => void;
}): JSX.Element {
  const ref = useReferenceData();
  const past = Boolean(date);
  const on = a?.date ?? (date || today);
  return (
    <Section
      title={past ? `Allocations on ${fmtDate(on)}` : "Allocations Today"}
      sub={`Everyone allocated on ${fmtDate(on)}${bu ? ` in ${bu}` : ", across every business unit"}.`}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1.5, mb: 2 }}>
        <Box sx={{ minWidth: 240 }}>
          <FilterSelect label="Select Business Unit" anyLabel="All" value={bu} options={ref.data?.businessUnits ?? []} onChange={(v) => onChange({ businessUnit: v })} />
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={past ? "past" : "today"}
          onChange={(_, v: "today" | "past" | null) => v && onChange({ date: v === "past" ? addDays(today, -1) : "" })}
          aria-label="Date"
          sx={{ "& .MuiToggleButton-root": { px: 2 } }}
        >
          <ToggleButton value="today">Today</ToggleButton>
          <ToggleButton value="past">Past Date</ToggleButton>
        </ToggleButtonGroup>
        {past ? (
          <Box sx={{ minWidth: 180 }}>
            <FilterDate label="Select Date" value={date} max={addDays(today, -1)} onChange={(v) => v && v < today && onChange({ date: v })} />
          </Box>
        ) : null}
      </Stack>
      {failed ? <Failed what="the allocations on this date" error={failed} onRetry={onRetry} retrying={retrying} /> : null}
      {!a ? (
        failed ? null : <Skeleton variant="rounded" height={200} />
      ) : (
        <>
      <KpiRow>
        <Kpi label="Allocations" value={n0(a.total)} note="Engagement and team allocations" />
        <Kpi label="Consultants Allocated" value={n0(a.consultants)} />
        <Kpi label="Paid Allocations" value={n0(a.paid)} note={a.total ? `${Math.round((a.paid / a.total) * 100)}% of allocations` : undefined} />
        <Kpi label="Non Paid Allocations" value={n0(a.nonPaid)} />
      </KpiRow>
      <Grid cols={3}>
        <Mini title="Allocations by Engagement Type">{a.byEngagementType.length ? <HBars rows={a.byEngagementType} percent /> : <Calm>Nobody is allocated on this date.</Calm>}</Mini>
        <Mini title="Paid Allocations by Allocation Type">
          {a.paidByAllocationType.length ? <HBars rows={a.paidByAllocationType} percent /> : <Calm>No paid allocations on this date.</Calm>}
        </Mini>
        <Mini title="Non Paid Allocations by Allocation Type">
          {a.nonPaidByAllocationType.length ? <HBars rows={a.nonPaidByAllocationType} percent /> : <Calm>No non paid allocations on this date.</Calm>}
        </Mini>
      </Grid>
        </>
      )}
    </Section>
  );
}

function AllocationsOverTime({ d }: { d: Dashboard }): JSX.Element {
  const o = d.allocationsOverTime!;
  const best = o.byMonth.reduce((m, r) => (r.value > m.value ? r : m), { month: "", value: 0 });
  return (
    <Section title="Allocations Over Time" sub="New engagement allocations by start month, over the last 12 months.">
      <Grid wide>
        <Mini title="Allocations by Month">
          {best.month ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Busiest month <b>{fmtMonth(best.month)}</b> with <b>{n0(best.value)}</b> allocations
            </Typography>
          ) : null}
          <MonthColumns rows={o.byMonth} name="Allocations" />
        </Mini>
        <Mini title="Allocations by Business Unit" center>
          <HBars rows={o.byBusinessUnit} percent />
        </Mini>
      </Grid>
    </Section>
  );
}

/** Two-column panels; an odd last one spans the row. */
function Panels({ children }: { children: ReactNode[] }): JSX.Element | null {
  if (!children.length) return null;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2, alignItems: "stretch", "& > :last-child:nth-child(odd)": { gridColumn: "1 / -1" } }}>
      {children}
    </Box>
  );
}

/** The travel agent's dashboard: only the agency's own travel requests, invoices and per diems. */
function AgentDashboard({ d }: { d: Dashboard }): JSX.Element {
  const a = d.agency!;
  const tiles = [
    { key: "open", count: a.inProgress, label: "Assigned and In Progress", to: engagementPaths.travelRequests("in-progress"), hot: false, hint: "Your agency's requests that are In Progress, Extended or On Hold" },
    { key: "7", count: a.startingIn7Days, label: "Starting in 7 Days", to: engagementPaths.travelRequests("in-progress"), hot: a.startingIn7Days > 0, hint: "Trips that start this week" },
    {
      key: "noinv",
      count: a.completedWithoutInvoice,
      label: "Completed Without an Invoice",
      to: engagementPaths.travelRequests("completed"),
      hot: a.completedWithoutInvoice > 0,
      hint: "Completed trips with no invoice from your agency yet",
    },
    { key: "rej", count: a.invoicesRejected, label: "Invoices Rejected", to: engagementPaths.travelRequests("all"), hot: a.invoicesRejected > 0, hint: "Rejected by travel or finance" },
  ];
  const panels = [
    a.upcoming.length ? (
      <Mini key="upcoming" title="Upcoming Trips" aside={a.upcomingTotal > 5 ? <ViewAll to={engagementPaths.travelRequests("in-progress")} /> : undefined}>
        {a.upcoming.slice(0, 5).map((x) => (
          <DateRow
            key={x.jobNumber}
            date={x.start}
            title={x.traveller.name}
            lines={[`${place(x.country, x.city)}, ${fmtRange(x.start, x.end)}`]}
            right={
              <>
                {x.status ? <TravelStatusChip status={x.status} /> : null}
                <Mono>{x.jobNumber}</Mono>
              </>
            }
            to={engagementPaths.travelRequest(x.jobNumber)}
          />
        ))}
      </Mini>
    ) : null,
    a.perDiemsOnOpenTrips.length ? (
      <Mini key="perdiems" title="Per Diems on Open Trips">
        {a.perDiemsOnOpenTrips.slice(0, 5).map((p) => (
          <DateRow
            key={`${p.jobNumber}${p.start}`}
            date={p.start.slice(0, 10)}
            title={p.traveller.name}
            lines={[`${fmtRange(p.start.slice(0, 10), p.end.slice(0, 10))}, ${plural(p.days, "day")}`]}
            right={
              <>
                <Typography sx={{ fontSize: 12.5 }}>{money(p.total, p.currency)}</Typography>
                <Mono>{p.jobNumber}</Mono>
              </>
            }
            to={engagementPaths.travelRequest(p.jobNumber)}
          />
        ))}
      </Mini>
    ) : null,
    a.invoicesByStatus.length ? (
      <Mini key="invoices" title="Invoices by Status">
        <HBars rows={a.invoicesByStatus} />
      </Mini>
    ) : null,
    a.tripsByMonth.some((m) => m.value) ? (
      <Mini key="months" title="Trips by Month">
        <MonthColumns rows={a.tripsByMonth} name="Trips" />
      </Mini>
    ) : null,
  ].filter(Boolean);
  return (
    <EaPage title="Dashboard" subtitle={`Travel requests handled by ${a.name} on ${fmtDate(localIsoDate())}.`}>
      <Section title="At a Glance">
        <QueueTiles tiles={tiles} />
      </Section>
      <Panels>{panels}</Panels>
    </EaPage>
  );
}
