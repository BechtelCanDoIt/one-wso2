
import { useState, type JSX } from "react";
import type { CostDuplicate } from "../../../api/dashboardTypes";
import { useTravelCostDuplicates } from "../../../api/useEngagementApi";
import { TableSkeleton } from "../../../components/EaSkeletons";
import EaTable, { type Column } from "../../../components/EaTable";
import { Empty, Failed } from "../../../components/ListCard";
import { Two } from "../../../components/StatusChips";
import JobLink from "../../../invoices/JobLink";
import { fmtDate, n0 } from "../../../model/format";
import type { WidgetCtx } from "../../widgets/types";
import { COST_SOURCE_LABEL } from "../../travelCostText";
import { usd2 } from "../costFormat";
import { costParams } from "../costView";
import { DuplicateDrawer } from "./TransactionDrawer";

const SIZE = 25;


const COLUMNS: readonly Column<CostDuplicate>[] = [
  { key: "job", label: "Travel Job Number", render: (x) => <JobLink job={x.jobNumber} /> },
  { key: "traveller", label: "Traveller", render: (x) => x.traveller?.name ?? "Unknown" },
  { key: "a", label: "Earlier Line", render: (x) => <Two main={COST_SOURCE_LABEL[x.a.source]} sub={`${x.a.reference || x.a.id}, ${fmtDate(x.a.date)}`} /> },
  { key: "b", label: "Later Line", render: (x) => <Two main={COST_SOURCE_LABEL[x.b.source]} sub={`${x.b.reference || x.b.id}, ${fmtDate(x.b.date)}`} /> },
  { key: "usd", label: "USD Amount", align: "right", render: (x) => usd2(x.usdAmount) },
  { key: "days", label: "Days Apart", align: "right", render: (x) => n0(x.daysApart) },
];

/** Possible duplicates: the same cost entered in two sources. */
export default function CostDuplicates({ ctx }: { ctx: WidgetCtx }): JSX.Element {
  const base = costParams(ctx.cost.view);
  const baseKey = JSON.stringify(base);
  // The page belongs to the filters it was chosen under: other filters start from the first page.
  const [paged, setPaged] = useState({ key: baseKey, page: 0 });
  const page = paged.key === baseKey ? paged.page : 0;
  const q = useTravelCostDuplicates({ ...base, limit: SIZE, offset: page * SIZE });
  const [open, setOpen] = useState<CostDuplicate | undefined>();
  const d = q.data;
  return (
    <>
      {q.isError ? (
        <Failed what="the possible duplicates" error={q.error} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      ) : q.isPending ? (
        <TableSkeleton columns={6} rows={4} />
      ) : d ? (
        <EaTable
          ariaLabel="Possible duplicates"
          columns={COLUMNS}
          rows={d.items}
          rowKey={(x) => `${x.a.id}:${x.b.id}`}
          onRowClick={setOpen}
          loading={q.isPlaceholderData}
          pagination={d.total > SIZE ? { page, pageSize: SIZE, total: d.total, onPage: (p) => setPaged({ key: baseKey, page: p }) } : undefined}
          empty={<Empty title="No possible duplicates in this period." />}
        />
      ) : null}
      {open ? <DuplicateDrawer a={open.a} b={open.b} onClose={() => setOpen(undefined)} /> : null}
    </>
  );
}
