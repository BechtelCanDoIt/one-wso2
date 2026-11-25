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

import { useState, type JSX } from "react";
import { Box, Stack } from "@wso2/oxygen-ui";
import TravelCostControls from "../travelCosts/TravelCostControls";
import { layoutBlocks } from "./layout";
import type { WidgetCtx, WidgetDef } from "./types";
import WidgetFrame from "./WidgetFrame";

/** The widgets in the order given (the page has already dropped those whose data the backend left out), laid out: full ones alone, half ones in pairs, the Travel Costs controls above the first cost widget. */
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
  // The widgets whose CSV is being prepared. They live here, above the layout blocks, because a block is remounted when an earlier one goes
  // and a frame's own state would then be lost, which would enable a second export while the first still runs.
  const [exporting, setExporting] = useState<ReadonlySet<string>>(new Set());
  const exportCsv = (def: WidgetDef) => () => {
    if (!def.csv) return;
    setExporting((s) => new Set(s).add(def.id));
    void ctx.cost.exportCsv(def.csv).finally(() =>
      setExporting((s) => {
        const next = new Set(s);
        next.delete(def.id);
        return next;
      }),
    );
  };
  const frame = (def: WidgetDef) => (
    <WidgetFrame key={def.id} def={def} ctx={ctx} pinned={pinned.includes(def.id)} exporting={exporting.has(def.id)} onExport={exportCsv(def)} onHide={() => onHide(def.id)} onPin={() => onPin(def.id)} />
  );
  return (
    <Stack spacing={2}>
      {layoutBlocks(defs).map((b, i) =>
        b.kind === "controls" ? (
          <TravelCostControls key="controls" cost={ctx.cost} today={ctx.businessDate} canDownloadTransactions={canDownloadTransactions} />
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
