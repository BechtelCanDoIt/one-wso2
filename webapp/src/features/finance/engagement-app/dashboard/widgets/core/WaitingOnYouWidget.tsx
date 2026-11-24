
import type { JSX } from "react";
import { QueueTiles } from "../../dashboardParts";
import type { WidgetCtx } from "../types";

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



/** Waiting on You: a tile per queue the person works; it opens the list. */
export default function WaitingOnYouWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element {
  const queue = (ctx.dashboard?.queue ?? []).map((q) => ({ key: q.key, count: q.count, label: q.label, to: q.to, hot: q.highlighted, hint: QUEUE_HINT[q.key] }));
  return <QueueTiles tiles={queue} />;
}
