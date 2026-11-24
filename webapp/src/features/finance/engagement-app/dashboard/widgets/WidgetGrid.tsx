
import type { JSX } from "react";
import { Box, Stack } from "@wso2/oxygen-ui";
import TravelCostControls from "../travelCosts/TravelCostControls";
import { layoutBlocks } from "./layout";
import type { WidgetCtx, WidgetDef } from "./types";
import { widgetState } from "./widgetState";
import WidgetFrame from "./WidgetFrame";

/** The widgets in the order given, laid out: full ones alone, half ones in pairs, the Travel Costs controls above the first cost widget. */
export default function WidgetGrid({
  defs,
  ctx,
  pinned,
  canDownloadTransactions,
  onHide,
  onPin,
}: {
  defs: readonly WidgetDef[];
  ctx: WidgetCtx;
  pinned: readonly string[];
  canDownloadTransactions: boolean;
  onHide: (id: string) => void;
  onPin: (id: string) => void;
}): JSX.Element {
  // A widget whose data the backend left out is not drawn.
  const shown = defs.filter((d) => widgetState(d, ctx).kind !== "absent");
  const frame = (def: WidgetDef) => <WidgetFrame key={def.id} def={def} ctx={ctx} pinned={pinned.includes(def.id)} onHide={() => onHide(def.id)} onPin={() => onPin(def.id)} />;
  return (
    <Stack spacing={2}>
      {layoutBlocks(shown).map((b, i) =>
        b.kind === "controls" ? (
          <TravelCostControls key="controls" cost={ctx.cost} today={ctx.today} canDownloadTransactions={canDownloadTransactions} />
        ) : b.kind === "full" ? (
          frame(b.def)
        ) : (
          <Box
            key={`halves-${i}`}
            sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2, alignItems: "stretch", "& > :last-of-type:nth-of-type(odd)": { gridColumn: { lg: "1 / -1" } } }}
          >
            {b.defs.map(frame)}
          </Box>
        ),
      )}
    </Stack>
  );
}
