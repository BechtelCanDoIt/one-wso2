
import { useEffect, useState, type JSX } from "react";
import { Box, Stack } from "@wso2/oxygen-ui";
import type { CostGroup, CostLine } from "../../../api/dashboardTypes";
import { useTravelCostTransactions } from "../../../api/useEngagementApi";
import EaTable, { type Column } from "../../../components/EaTable";
import { FilterSelect } from "../../../components/FilterFields";
import { Empty, Failed } from "../../../components/ListCard";
import { Status, Two, Mono } from "../../../components/StatusChips";
import { DelayedSkeleton, TableSkeleton } from "../../../components/EaSkeletons";
import { fmtDate, n0, n2 } from "../../../model/format";
import type { WidgetCtx } from "../../widgets/types";
import { COST_SOURCE_LABEL } from "../../travelCostText";
import { monthWithin } from "../dateRanges";
import { deltaCell, deltaTone, originalText, PAID_LABEL, PAID_TONE, rateSourceText, usd2 } from "../costFormat";
import { Change } from "../../dashboardParts";
import { clampPage, GROUPS, PAGE_SIZE, transactionParams, type CostSort, type FilterKey, type GroupBy } from "../costView";
import TransactionDrawer from "./TransactionDrawer";

const GROUP_LABEL: Readonly<Record<GroupBy, string>> = {
  employee: "Employee",
  jobNumber: "Job Number",
  country: "Destination Country",
  customer: "Customer",
  travelAgent: "Travel Agent",
  source: "Source",
  costType: "Cost Type",
  month: "Month",
};

const SORT_LABEL: Readonly<Record<CostSort, string>> = { "-date": "Newest First", date: "Oldest First", "-amount": "Highest Amount", amount: "Lowest Amount" };

/** The filter a group row sets. A month has none: it narrows the range instead. */
const GROUP_FILTER: Readonly<Record<Exclude<GroupBy, "month">, FilterKey>> = {
  employee: "tcEmployee",
  jobNumber: "tcJob",
  country: "tcCountry",
  customer: "tcCustomer",
  travelAgent: "tcAgent",
  source: "tcSource",
  costType: "tcCostType",
};

const LINE_COLUMNS: readonly Column<CostLine>[] = [
  { key: "date", label: "Date", render: (l) => fmtDate(l.date) },
  { key: "ref", label: "Reference", render: (l) => <Two main={<Mono>{l.reference || l.id}</Mono>} sub={l.jobNumber ?? "No job number"} /> },
  { key: "traveller", label: "Traveller", render: (l) => <Two main={l.traveller?.name ?? "Unknown"} sub={l.country} /> },
  { key: "source", label: "Source", render: (l) => <Two main={COST_SOURCE_LABEL[l.source]} sub={l.costType} /> },
  { key: "paid", label: "Engagement", render: (l) => <Status label={PAID_LABEL[l.paid]} tone={PAID_TONE[l.paid]} /> },
  { key: "original", label: "Original Amount", align: "right", render: (l) => originalText(l) },
  { key: "usd", label: "USD Amount", align: "right", render: (l) => (l.usdAmount === undefined ? "Not converted" : usd2(l.usdAmount)) },
  { key: "rate", label: "Rate", render: (l) => (l.rate === undefined ? "None" : <Two main={n2(l.rate)} sub={rateSourceText(l)} />) },
];

/** Transactions: every cost line behind the figures, with Group By and a row's detail. */
export default function CostTransactions({ ctx }: { ctx: WidgetCtx }): JSX.Element {
  const { view, set } = ctx.cost;
  // Not asked before the business date is known: the period would otherwise start from the browser's date and then move.
  const q = useTravelCostTransactions(transactionParams(view), ctx.cost.ready);
  const [open, setOpen] = useState<CostLine | undefined>();
  const compared = Boolean(ctx.cost.query.data?.compare);
  const d = q.data;

  const drillGroup = (g: CostGroup) => {
    if (!g.key) return;
    if (view.group === "month") {
      const r = monthWithin(g.key, view.period);
      set({ tcRange: "custom", tcFrom: r.from, tcTo: r.to, tcGroup: undefined });
    }
    else if (view.group) ctx.cost.drill(GROUP_FILTER[view.group], g.key);
  };
  const groupColumns: Column<CostGroup>[] = [
    { key: "label", label: view.group ? GROUP_LABEL[view.group] : "", render: (g) => g.label },
    { key: "lines", label: "Lines", align: "right", render: (g) => n0(g.lines) },
    { key: "trips", label: "Trips", align: "right", render: (g) => n0(g.trips) },
    { key: "travellers", label: "Travellers", align: "right", render: (g) => n0(g.travellers) },
    { key: "total", label: "Total", align: "right", render: (g) => usd2(g.total) },
    ...(compared
      ? [
          { key: "previous", label: "Last Year", align: "right", render: (g: CostGroup) => (g.previous === undefined ? "—" : usd2(g.previous)) } as Column<CostGroup>,
          { key: "change", label: "Change", align: "right", render: (g: CostGroup) => <Change text={deltaCell(g, true)} tone={deltaTone(g, true, "spend")} /> } as Column<CostGroup>,
        ]
      : []),
  ];
  // A page past the end (an old link, a filter that left fewer rows) goes to the last page instead of showing "No transactions".
  const page = d ? clampPage(view.page, d.total) : view.page;
  useEffect(() => {
    if (d && page !== view.page) set({ tcPage: page > 0 ? String(page) : undefined });
  }, [d, page, view.page, set]);
  const pagination = d && d.total > PAGE_SIZE ? { page, pageSize: PAGE_SIZE, total: d.total, onPage: (p: number) => set({ tcPage: p > 0 ? String(p) : undefined }) } : undefined;

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, flexWrap: "wrap", rowGap: 1.5, alignItems: "center" }}>
        <Box sx={{ minWidth: 220 }}>
          <FilterSelect label="Group By" anyLabel="No Grouping" value={view.group ?? ""} options={GROUPS.map((g) => [g, GROUP_LABEL[g]] as const)} onChange={(v) => set({ tcGroup: v || undefined })} />
        </Box>
        {!view.group ? (
          <Box sx={{ minWidth: 200 }}>
            <FilterSelect
              label="Sort"
              anyLabel={null}
              value={view.sort}
              options={(Object.keys(SORT_LABEL) as CostSort[]).map((s) => [s, SORT_LABEL[s]] as const)}
              onChange={(v) => set({ tcSort: v === "-date" ? undefined : v })}
            />
          </Box>
        ) : null}
        {d?.kind === "lines" ? <Box sx={{ ml: { sm: "auto" }, fontSize: 13, color: "text.secondary" }}>Total {usd2(d.totalUsd)} across {n0(d.total)} lines</Box> : null}
      </Stack>
      {q.isError ? (
        <Failed what="the transactions" error={q.error} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      ) : q.isPending ? (
        <DelayedSkeleton minHeight={260}>
          <TableSkeleton columns={6} rows={6} />
        </DelayedSkeleton>
      ) : d?.kind === "groups" ? (
        <EaTable
          ariaLabel="Transactions by group"
          columns={groupColumns}
          rows={d.groups}
          rowKey={(g) => g.key || g.label}
          onRowClick={drillGroup}
          canOpen={(g) => Boolean(g.key)}
          loading={q.isPlaceholderData}
          pagination={pagination}
          empty={<Empty title="No transactions match these filters." />}
        />
      ) : d ? (
        <EaTable
          ariaLabel="Transactions"
          columns={LINE_COLUMNS}
          rows={d.items}
          rowKey={(l) => l.id}
          onRowClick={setOpen}
          loading={q.isPlaceholderData}
          pagination={pagination}
          empty={<Empty title="No transactions match these filters." />}
        />
      ) : null}
      {open ? <TransactionDrawer line={open} onClose={() => setOpen(undefined)} /> : null}
    </>
  );
}
