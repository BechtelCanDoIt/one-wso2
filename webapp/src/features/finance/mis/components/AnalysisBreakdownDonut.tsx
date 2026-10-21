/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Cell, Pie, PieChart } from "recharts";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useColorScheme,
} from "@wso2/oxygen-ui";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import {
  CHART_ENTITY_SERIES,
  CHART_OTHER,
  CHART_SERIES_1,
  CHART_SERIES_2,
  seriesColor,
} from "@components/charts/chartPalette";
import { MIS_VALUE_TYPES, formatMisValue } from "../util/misMoney";
import type { MisScale } from "../util/misViewVocabulary";
import { analysisSurfaceSx } from "./misLookTokens";
import { partnerModelSlices } from "./analysisBreakdowns";
import type { AnalysisAccountRow } from "./analysisAccountRows";
import {
  analysisRegionEntities,
  entitiesWithinPartnerModels,
  type RegionEntity,
} from "./analysisRegionEntities";
import type { PartnerModelBreakdown } from "../api/useAnalysisBreakdowns";

// ARR Breakdown: two pie rings, the partner model inside and the region entity
// outside, so the card answers both "how much is sold through a partner" and
// "where".
//
// Channel is always slot 1 and Direct slot 2, whichever is larger, so a view
// where Direct overtakes Channel does not repaint either. The outer hues go by
// the entity's rank.
//
// The legend table is the accessible presentation of the same figures, and the
// only place the dollars are written.

const DONUT_SIZE = 240;
const INNER_RING = { inner: 0, outer: 70 };
const OUTER_RING = { inner: 78, outer: 108 };

export interface AnalysisBreakdownDonutProps {
  breakdown: PartnerModelBreakdown;
  accounts: readonly AnalysisAccountRow[];
  bySubRegion: boolean;
  scale: MisScale;
}

export default function AnalysisBreakdownDonut({
  breakdown,
  accounts,
  bySubRegion,
  scale,
}: AnalysisBreakdownDonutProps) {
  const mode = useLiveScheme();
  const models = partnerModelSlices({
    channel: breakdown.channel,
    direct: breakdown.direct,
    asked: breakdown.asked,
  });

  const unanswered =
    (breakdown.asked.has("Channel") && breakdown.channel == null) ||
    (breakdown.asked.has("Direct") && breakdown.direct == null);

  // The reader narrowed to a partner type that is neither Channel nor Direct;
  // saying "no ARR" would be false, the account table is full.
  const askedNeither = breakdown.asked.size === 0;

  const hasFigures = !breakdown.isLoading && !breakdown.isError && models.length > 0;

  const entities = analysisRegionEntities(accounts, { bySubRegion });
  const groups = entitiesWithinPartnerModels(models, accounts, entities);
  const total = models.reduce((sum, model) => sum + model.amount, 0);

  const modelColour = (slot: 1 | 2) =>
    seriesColor(slot === 1 ? CHART_SERIES_1 : CHART_SERIES_2, mode);
  const entityColour = ({ rank }: RegionEntity) =>
    seriesColor(rank === null ? CHART_OTHER : (CHART_ENTITY_SERIES[rank] ?? CHART_OTHER), mode);

  const share = (amount: number) => (total > 0 ? (amount / total) * 100 : 0);
  const amountText = (amount: number) => formatMisValue(amount, MIS_VALUE_TYPES.CURRENCY, { scale });
  const shareText = (amount: number) =>
    `${formatMisValue(share(amount), MIS_VALUE_TYPES.PERCENTAGE, { scale })}%`;

  return (
    <Box sx={(theme) => ({ ...analysisSurfaceSx(theme), height: "100%", p: 2 })}>
      <Typography component="h2" variant="subtitle2" sx={{ mb: 0.25 }}>
        ARR Breakdown
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        Partner model, with the {entities.label.toLowerCase()}s behind each.
      </Typography>

      {breakdown.isError ? (
        <ErrorNotice onRetry={breakdown.retry}>
          Couldn&apos;t load the partner split. {breakdown.errorMessage}
        </ErrorNotice>
      ) : breakdown.isLoading ? (
        <Box sx={{ height: DONUT_SIZE, borderRadius: 0.5, bgcolor: "action.hover" }} />
      ) : unanswered ? (
        // `isError` is false here, since one of the two reads succeeded, so
        // nothing upstream offers a way out.
        <ErrorNotice onRetry={breakdown.retry}>
          One partner model didn&apos;t load, so the split can&apos;t be shown.
        </ErrorNotice>
      ) : models.length === 0 ? null : (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <PieChart width={DONUT_SIZE} height={DONUT_SIZE} aria-hidden>
            <Pie
              data={models}
              dataKey="amount"
              nameKey="label"
              innerRadius={INNER_RING.inner}
              outerRadius={INNER_RING.outer}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {models.map((model) => (
                <Cell key={model.id} fill={modelColour(model.slot)} />
              ))}
            </Pie>
            <Pie
              data={groups.flatMap((group) => group.entities)}
              dataKey="amount"
              nameKey="name"
              innerRadius={OUTER_RING.inner}
              outerRadius={OUTER_RING.outer}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {groups.flatMap((group) =>
                group.entities.map((entity) => (
                  <Cell key={`${group.model.id}:${entity.name}`} fill={entityColour(entity)} />
                )),
              )}
            </Pie>
          </PieChart>
        </Box>
      )}

      {/* Always mounted: a live region created as its text appears is announced
          unreliably or not at all. */}
      <Box role="status" sx={{ minHeight: 18, mt: 1 }}>
        {!breakdown.isLoading && !breakdown.isError && !unanswered && models.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {askedNeither
              ? "Channel and Direct don't apply to the partner type this view is narrowed to."
              : "No ARR in this view."}
          </Typography>
        )}
      </Box>

      {hasFigures && (
        <Table size="small" aria-label="ARR Breakdown legend" sx={{ mt: 1.5 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={HEAD_SX}>Partner model / {entities.label}</TableCell>
              <TableCell align="right" sx={HEAD_SX}>
                ARR
              </TableCell>
              <TableCell align="right" sx={HEAD_SX}>
                Share
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map(({ model, entities: arcs }) => [
              <LegendRow
                key={model.id}
                name={model.label}
                colour={modelColour(model.slot)}
                amount={amountText(model.amount)}
                share={shareText(model.amount)}
                bold
              />,
              ...arcs.map((arc) => (
                <LegendRow
                  key={`${model.id}:${arc.name}`}
                  name={arc.name}
                  colour={entityColour(arc)}
                  amount={amountText(arc.amount)}
                  share={shareText(arc.amount)}
                />
              )),
            ])}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

function LegendRow({
  name,
  colour,
  amount,
  share,
  bold = false,
}: {
  name: string;
  colour: string;
  amount: string;
  share: string;
  bold?: boolean;
}) {
  const cellSx = { ...CELL_SX, fontWeight: bold ? 700 : 400 };
  return (
    <TableRow>
      <TableCell sx={cellSx}>
        <Box
          aria-hidden
          component="span"
          sx={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "2px",
            mr: 0.75,
            ml: bold ? 0 : 1.5,
            bgcolor: colour,
          }}
        />
        {name}
      </TableCell>
      <TableCell align="right" sx={cellSx}>
        {amount}
      </TableCell>
      <TableCell align="right" sx={cellSx}>
        {share}
      </TableCell>
    </TableRow>
  );
}

/** See AnalysisIndustryChart: palette.mode does not track the live scheme. */
function useLiveScheme(): "light" | "dark" {
  const { mode, systemMode } = useColorScheme();
  const resolved = mode === "system" ? systemMode : mode;
  return resolved === "dark" ? "dark" : "light";
}

/** `tabular-nums` so a column of figures lines up when scanned down. */
const CELL_SX = { fontSize: 12.5, fontVariantNumeric: "tabular-nums" } as const;
const HEAD_SX = { fontSize: 11, fontWeight: 700, color: "text.secondary" } as const;
