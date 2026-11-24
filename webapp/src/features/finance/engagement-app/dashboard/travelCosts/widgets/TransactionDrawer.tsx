
import type { JSX } from "react";
import type { CostLine } from "../../../api/dashboardTypes";
import { FactsGrid } from "../../../components/Facts";
import RecordDrawer from "../../../components/RecordDrawer";
import RecordLink from "../../../components/RecordLink";
import { Status } from "../../../components/StatusChips";
import { engagementPaths } from "../../../engagementPaths";
import JobLink from "../../../invoices/JobLink";
import { fmtDate, n2 } from "../../../model/format";
import { COST_SOURCE_LABEL } from "../../travelCostText";
import { originalText, PAID_LABEL, PAID_TONE, rateSourceText, usd2 } from "../costFormat";

/** One cost line's facts, with how its USD amount was found. */
export function LineFacts({ line }: { line: CostLine }): JSX.Element {
  const l = line;
  return (
    <FactsGrid
      columns={2}
      facts={[
        { label: "Line", value: l.id },
        { label: "Source", value: COST_SOURCE_LABEL[l.source] },
        { label: "Reference", value: l.reference },
        { label: "Travel Job Number", value: l.jobNumber ? <JobLink job={l.jobNumber} /> : "None" },
        { label: "Traveller", value: l.traveller ? `${l.traveller.name}${l.traveller.name === l.traveller.email ? "" : `, ${l.traveller.email}`}` : undefined },
        { label: "Date", value: fmtDate(l.date) },
        { label: "Cost Type", value: l.costType },
        { label: "Source Type", value: l.sourceType },
        { label: "Destination Country", value: l.country },
        { label: "Travel Agent", value: l.travelAgent?.name },
        { label: "Customer", value: l.customer },
        { label: "Engagement", value: <Status label={PAID_LABEL[l.paid]} tone={PAID_TONE[l.paid]} /> },
        { label: "Engagement ID", value: l.engagementId ? <RecordLink to={engagementPaths.engagement(l.engagementId)} kind="engagement">{l.engagementId}</RecordLink> : undefined },
        { label: "Allocation Type", value: l.allocationType },
        { label: "Original Amount", value: originalText(l) },
        { label: "USD Amount", value: l.usdAmount === undefined ? "Not converted" : usd2(l.usdAmount) },
        { label: "Rate", value: l.rate === undefined ? undefined : `${n2(l.rate)} ${l.originalCurrency || "units"} for 1 USD` },
        { label: "Rate Date", value: l.rateDate ? fmtDate(l.rateDate) : undefined },
        { label: "How It Was Converted", value: rateSourceText(l), full: true },
      ]}
    />
  );
}

/** A transaction in a side drawer. */
export default function TransactionDrawer({ line, onClose }: { line: CostLine; onClose: () => void }): JSX.Element {
  return (
    <RecordDrawer title={line.reference || line.id} subtitle={`${COST_SOURCE_LABEL[line.source]}, ${fmtDate(line.date)}`} onClose={onClose}>
      <LineFacts line={line} />
    </RecordDrawer>
  );
}
