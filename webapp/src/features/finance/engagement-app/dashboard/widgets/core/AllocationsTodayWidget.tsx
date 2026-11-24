
import type { JSX } from "react";
import { Box, Skeleton, Stack, ToggleButton, ToggleButtonGroup } from "@wso2/oxygen-ui";
import { useReferenceData } from "../../../api/useEngagementApi";
import { FilterDate, FilterSelect } from "../../../components/FilterFields";
import { Failed } from "../../../components/ListCard";
import { addDays, n0 } from "../../../model/format";
import { Calm, HBars, Kpi, KpiRow } from "../../dashboardParts";
import { Block } from "../parts";
import type { WidgetCtx } from "../types";



/** The legacy Allocations dashboard (privilege 1), with its Business Unit and Today / Past Date choices. */
export default function AllocationsTodayWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element {
  const ref = useReferenceData();
  const { businessUnit: bu, date, query, change } = ctx.allocationsToday;
  const a = query.data;
  const past = Boolean(date);
  return (
    <>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1.5, mb: 2 }}>
        <Box sx={{ minWidth: 240 }}>
          <FilterSelect label="Select Business Unit" anyLabel="All" value={bu} options={ref.data?.businessUnits ?? []} onChange={(v) => change({ businessUnit: v })} />
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={past ? "past" : "today"}
          onChange={(_, v: "today" | "past" | null) => v && change({ date: v === "past" ? addDays(ctx.today, -1) : "" })}
          aria-label="Date"
          sx={{ "& .MuiToggleButton-root": { px: 2 } }}
        >
          <ToggleButton value="today">Today</ToggleButton>
          <ToggleButton value="past">Past Date</ToggleButton>
        </ToggleButtonGroup>
        {past ? (
          <Box sx={{ minWidth: 180 }}>
            <FilterDate label="Select Date" value={date} max={addDays(ctx.today, -1)} onChange={(v) => v && v < ctx.today && change({ date: v })} />
          </Box>
        ) : null}
      </Stack>
      {query.isError ? <Failed what="the allocations on this date" error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} /> : null}
      {!a ? (
        query.isError ? null : <Skeleton variant="rounded" height={200} aria-busy="true" />
      ) : (
        <>
          <KpiRow>
            <Kpi label="Allocations" value={n0(a.total)} note="Engagement allocations only" />
            <Kpi label="Consultants Allocated" value={n0(a.consultants)} />
            <Kpi label="Paid Allocations" value={n0(a.paid)} note={a.total ? `${Math.round((a.paid / a.total) * 100)}% of allocations` : undefined} />
            <Kpi label="Non Paid Allocations" value={n0(a.nonPaid)} />
          </KpiRow>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" }, gap: 3, mt: 2.5 }}>
            <Block title="Allocations by Engagement Type">{a.byEngagementType.length ? <HBars rows={a.byEngagementType} percent /> : <Calm>Nobody is allocated on this date.</Calm>}</Block>
            <Block title="Paid Allocations by Allocation Type">
              {a.paidByAllocationType.length ? <HBars rows={a.paidByAllocationType} percent /> : <Calm>No paid allocations on this date.</Calm>}
            </Block>
            <Block title="Non Paid Allocations by Allocation Type">
              {a.nonPaidByAllocationType.length ? <HBars rows={a.nonPaidByAllocationType} percent /> : <Calm>No non paid allocations on this date.</Calm>}
            </Block>
          </Box>
        </>
      )}
    </>
  );
}
