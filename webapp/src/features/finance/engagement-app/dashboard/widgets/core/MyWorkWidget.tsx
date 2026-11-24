
import type { JSX } from "react";
import { Box } from "@wso2/oxygen-ui";
import { AllocationStatusChip, TravelStatusChip } from "../../../components/StatusChips";
import { fmtRange, place } from "../../../model/format";
import { DateRow } from "../../dashboardParts";
import { Block } from "../parts";
import type { WidgetCtx } from "../types";

/** My Work: the person's current and next allocation, and next trips. */
export default function MyWorkWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element {
  const my = ctx.dashboard?.myWork;
  const cards = [
    my?.allocations.length ? (
      <Block key="allocation" title="My Allocation">
        {my.allocations.slice(0, 2).map((a) => (
          <DateRow
            key={a.id}
            date={a.start}
            title={a.title || a.engagementId}
            lines={[fmtRange(a.start, a.end)]}
            right={a.status ? <AllocationStatusChip status={a.status} /> : undefined}
          />
        ))}
      </Block>
    ) : null,
    my?.trips.length ? (
      <Block key="trip" title="My Next Trip">
        {my.trips.slice(0, 2).map((t) => (
          <DateRow
            key={t.jobNumber}
            date={t.start}
            title={place(t.country, t.city)}
            lines={[fmtRange(t.start, t.end), t.travelAgent ? `Travel Agent ${t.travelAgent}` : "No travel agent yet"]}
            right={t.status ? <TravelStatusChip status={t.status} /> : undefined}
          />
        ))}
      </Block>
    ) : null,
  ].filter(Boolean);
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: cards.length > 1 ? "1fr 1fr" : "1fr" }, columnGap: 5, rowGap: 3 }}>{cards}</Box>;
}

