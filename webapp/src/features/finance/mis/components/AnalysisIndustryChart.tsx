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

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@wso2/oxygen-ui";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import {
  CHART_ENTITY_SERIES,
  CHART_FILL_GAP,
  CHART_OTHER,
  chartChrome,
  seriesColor,
} from "@components/charts/chartPalette";
import { useLiveScheme } from "@components/charts/useLiveScheme";
import { MIS_VALUE_TYPES, formatMisValue, misHeadlineAmount } from "../util/misMoney";
import type { MisScale } from "../util/misViewVocabulary";
import { analysisSurfaceSx } from "./misLookTokens";
import { industrySeries } from "./analysisBreakdowns";
import type { AnalysisAccountRow } from "./analysisAccountRows";
import {
  analysisRegionEntities,
  industryRegionStacks,
  type RegionEntity,
} from "./analysisRegionEntities";
import type { IndustryBar } from "./analysisRegionEntities";
import type { IndustryBreakdown } from "../api/useAnalysisBreakdowns";

// ARR by industry — six named industries and whatever else the book holds, as
// vertical bars stacked by region entity.
//
// A region keeps its hue here and in the ARR Breakdown donut, because both take
// it from the same ranking (`analysisRegionEntities`). Each industry's share
// sits on its axis label, so the mix reads without hovering.
//
// ---- and the thing this chart will NOT claim -------------------------------
//
// An industry the backend did not offer is never asked about, and gets no bar
// at all rather than a zero one. A zero bar would state "this industry holds
// no ARR" on the strength of a question nobody put.
// `analysisBreakdowns.ts` keeps the two apart; this renders the distinction.

export interface AnalysisIndustryChartProps {
  breakdown: IndustryBreakdown;
  accounts: readonly AnalysisAccountRow[];
  /** Whether a region filter is applied, which cuts the stacks by sub-region instead. */
  bySubRegion: boolean;
  /** The whole book, for Other and for every share. Absent if that read failed. */
  totalArr?: number;
  scale: MisScale;
}

export default function AnalysisIndustryChart({
  breakdown,
  accounts,
  bySubRegion,
  totalArr,
  scale,
}: AnalysisIndustryChartProps) {
  const { palette } = useTheme();
  const mode = useLiveScheme();
  const chrome = chartChrome(mode);
  const entityColour = ({ rank }: RegionEntity) =>
    seriesColor(rank === null ? CHART_OTHER : (CHART_ENTITY_SERIES[rank] ?? CHART_OTHER), mode);

  const rows = useMemo(
    () => industrySeries({ byIndustry: breakdown.byIndustry, asked: breakdown.asked, totalArr }),
    [breakdown.byIndustry, breakdown.asked, totalArr],
  );

  // Memoised to keep the render cheap — a fresh array every render would have
  // recharts recompute its whole layout. (NOT for the animation: that is off
  // below, so there is no entry replay to avoid.)
  // Only the bars there is a figure for, and only while any of them is
  // non-zero. Every industry answering zero is reachable — an ARR Range no
  // account falls in — and drew seven flat bars, which reads as a chart that
  // failed rather than as an empty view. The partner chart beside it already
  // says so in that case, and the two must not disagree about what empty looks
  // like.
  const plotted = useMemo(() => {
    const withFigures = rows.filter((row) => row.amount != null);
    return withFigures.some((row) => (row.amount ?? 0) > 0) ? withFigures : [];
  }, [rows]);
  // Two different absences, and the reader is owed two different sentences. An
  // industry this tenant does not track is a fact about the tenant; one whose
  // read fell over is a fact about today.
  const unasked = rows.filter((row) => !row.asked);
  const unanswered = rows.filter((row) => row.asked && !row.answered);
  // Nothing below the chart while there is no answer to put in it.
  //
  // This DOES blank on a filter change, and saying otherwise would be wrong:
  // every MIS read is keyed on its request body, so a new narrowing is a new
  // key with no cached figures, and `isPending` is true. Holding the previous
  // answer across that would take a `placeholderData: (prev) => prev` on the
  // queries — a change to `useColumnQueries` affecting every MIS table, so it
  // belongs to whoever decides it for all of them rather than to this chart.
  const { bars, legend } = useMemo(
    () =>
      industryRegionStacks(
        plotted,
        accounts,
        analysisRegionEntities(accounts, { bySubRegion }),
      ),
    [plotted, accounts, bySubRegion],
  );
  const shareByIndustry = new Map(
    bars.map((bar) => [
      bar.industry,
      bar.share == null
        ? undefined
        : `${formatMisValue(bar.share, MIS_VALUE_TYPES.PERCENTAGE, { scale })}%`,
    ]),
  );

  const hasFigures = !breakdown.isLoading && !breakdown.isError && plotted.length > 0;

  return (
    <Box sx={(theme) => ({ ...analysisSurfaceSx(theme), height: "100%", p: 2 })}>
      <Typography component="h2" variant="subtitle2" sx={{ mb: 0.25 }}>
        ARR by industry
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        The six industries this screen names, and everything else as Other.
      </Typography>

      {breakdown.isError ? (
        <ErrorNotice onRetry={breakdown.retry}>
          Couldn&apos;t load the industry breakdown. {breakdown.errorMessage}
        </ErrorNotice>
      ) : breakdown.isLoading ? (
        <Box sx={{ height: CHART_HEIGHT, borderRadius: 0.5, bgcolor: "action.hover" }} />
      ) : plotted.length === 0 ? (
        <Box sx={{ height: CHART_HEIGHT }} />
      ) : (
        <Box sx={{ height: CHART_HEIGHT }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={bars}
              margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
              barCategoryGap="28%"
            >
              {/* Solid hairlines, one shade off the surface, and only along the
                  measure. A dashed grid reads as a projection or a threshold
                  when it is only a grid. */}
              <CartesianGrid vertical={false} stroke={chrome.line} />
              <XAxis
                dataKey="industry"
                interval={0}
                height={AXIS_HEIGHT}
                tick={<IndustryTick shares={shareByIndustry} fill={chrome.tick} />}
                stroke={chrome.line}
                tickLine={false}
              />
              <YAxis
                type="number"
                tickFormatter={(value: number) => misHeadlineAmount(value)}
                tick={{ fill: chrome.tick, fontSize: 11 }}
                stroke={chrome.line}
                tickLine={false}
                width={56}
              />
              <RTooltip
                cursor={{ fill: chrome.line }}
                // `misHeadlineAmount`, the same formatter as the axis —
                // NOT the reader's Scale. Everything ON a chart is a Headline
                // and never scaled, so an axis reading `$1.2M` beside a tooltip
                // reading `1,234.57` would be one chart contradicting itself.
                // The exact figure, at the reader's Scale, is one row down in
                // the companion table, which is what a table is for.
                //
                // Recharts types the value as possibly absent; a stack is only
                // drawn for a figure, so the coercion satisfies the type.
                formatter={(value) => misHeadlineAmount(Number(value))}
                contentStyle={{
                  background: palette.background.paper,
                  border: `1px solid ${palette.divider}`,
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              {legend.map((entity) => (
                <Bar
                  key={entity.name}
                  name={entity.name}
                  dataKey={(bar: IndustryBar) => bar.stacks[entity.name] ?? 0}
                  stackId="region"
                  fill={entityColour(entity)}
                  stroke={palette.background.paper}
                  strokeWidth={CHART_FILL_GAP / 2}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}

      {hasFigures && (
        <Box
          component="ul"
          aria-label="Region legend"
          sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, listStyle: "none", m: 0, mt: 1, p: 0 }}
        >
          {legend.map((entity) => (
            <Typography key={entity.name} component="li" variant="caption" color="text.secondary">
              <Box
                aria-hidden
                component="span"
                sx={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "2px",
                  mr: 0.75,
                  bgcolor: entityColour(entity),
                }}
              />
              {entity.name}
            </Typography>
          ))}
        </Box>
      )}

      {/* ONE always-mounted live region, carrying every sentence this card has
          to say. Always mounted because a region created at the moment its text
          appears is announced unreliably or not at all — `MisFilterBar` states
          the rule and this repo follows it. And it carries the two explanation
          lines as well as the empty state, because a chart that silently loses
          bars is exactly what a reader who cannot see it needs telling about. */}
      <Box role="status" sx={{ minHeight: 18, mt: 1 }}>
        {!breakdown.isLoading && !breakdown.isError && (
          <>
            {plotted.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No industry figures in this view.
              </Typography>
            )}
            {unasked.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Not reported by this tenant: {unasked.map((row) => row.industry).join(", ")}. No
                figure was requested for these, so they are left out rather than shown as zero.
              </Typography>
            )}
            {unanswered.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Didn&apos;t load: {unanswered.map((row) => row.industry).join(", ")}. These were
                asked for and did not answer, so they are left out rather than shown as zero — and
                Other is withheld, because it would otherwise absorb them.
              </Typography>
            )}
          </>
        )}
      </Box>

      {hasFigures && (
        <Table size="small" sx={{ mt: 1.5 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={HEAD_SX}>Industry</TableCell>
              <TableCell align="right" sx={HEAD_SX}>
                ARR
              </TableCell>
              <TableCell align="right" sx={HEAD_SX}>
                Share
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.industry}>
                <TableCell sx={CELL_SX}>{row.industry}</TableCell>
                <TableCell align="right" sx={CELL_SX}>
                  {/* An em dash, not a zero: this industry was never asked
                      about, or its read failed. Either way the cell has
                      nothing to report, and a `0` would report something. */}
                  {row.amount == null
                    ? "—"
                    : formatMisValue(row.amount, MIS_VALUE_TYPES.CURRENCY, { scale })}
                </TableCell>
                <TableCell align="right" sx={CELL_SX}>
                  {row.share == null
                    ? "—"
                    : `${formatMisValue(row.share, MIS_VALUE_TYPES.PERCENTAGE, { scale })}%`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

const CHART_HEIGHT = 300;
const AXIS_HEIGHT = 64;
const TICK_LINE_CHARS = 14;
const TICK_LINE_HEIGHT = 12;

/** Breaks a name into lines no longer than a vertical bar's width can carry. */
function wrapName(name: string): string[] {
  const lines: string[] = [];
  for (const word of name.split(" ")) {
    const last = lines.at(-1);
    if (last !== undefined && last.length + 1 + word.length <= TICK_LINE_CHARS) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else {
      lines.push(word);
    }
  }
  return lines;
}

interface IndustryTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  shares: ReadonlyMap<string, string | undefined>;
  fill: string;
}

/** An industry's name, wrapped, with its share on the line below. */
function IndustryTick({ x = 0, y = 0, payload, shares, fill }: IndustryTickProps) {
  const name = payload?.value ?? "";
  const share = shares.get(name);
  const lines = share === undefined ? wrapName(name) : [...wrapName(name), share];
  return (
    <text x={x} y={y + 10} textAnchor="middle" fill={fill} fontSize={10.5}>
      {lines.map((line, index) => (
        <tspan key={line} x={x} dy={index === 0 ? 0 : TICK_LINE_HEIGHT}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

const CELL_SX = { fontSize: 12.5, fontVariantNumeric: "tabular-nums" } as const;
const HEAD_SX = { fontSize: 11, fontWeight: 700, color: "text.secondary" } as const;
