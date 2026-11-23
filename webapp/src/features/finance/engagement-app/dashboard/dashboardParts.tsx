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

import type { JSX, ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { Box, Button, ButtonBase, Card, Stack, Typography } from "@wso2/oxygen-ui";
import { BarChart } from "@wso2/oxygen-ui-charts-react";
import { CircleCheckIcon } from "@wso2/oxygen-ui-icons-react";
import type { CountRow, MonthValue } from "../api/engagementTypes";
import { fmtMonth, n0 } from "../model/format";

/** A dashboard section: a heading, one plain line, and its content. */
export function Section({ title, sub, aside, children }: { title: string; sub?: ReactNode; aside?: ReactNode; children: ReactNode }): JSX.Element {
  return (
    <Box component="section" sx={{ mb: 3.5 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5, mb: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {title}
          </Typography>
          {sub ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {sub}
            </Typography>
          ) : null}
        </Box>
        {aside}
      </Box>
      {children}
    </Box>
  );
}

/** A titled card inside a section; `center` sets short content in the middle of a card stretched to its neighbour's height. */
export function Mini({ title, aside, center = false, children }: { title: string; aside?: ReactNode; center?: boolean; children: ReactNode }): JSX.Element {
  return (
    <Card variant="outlined" sx={{ p: 2, minWidth: 0, height: "100%", boxSizing: "border-box", ...(center ? { display: "flex", flexDirection: "column" } : {}) }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1.25 }}>
        <Typography component="h3" sx={{ fontSize: 14.5, fontWeight: 600, flex: 1 }}>
          {title}
        </Typography>
        {aside}
      </Box>
      {center ? <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>{children}</Box> : children}
    </Card>
  );
}

/** Cards in a row of equal height; `wide` gives the first (a chart) more room than the second (a short list). */
export function Grid({ cols = 2, wide = false, children }: { cols?: 2 | 3; wide?: boolean; children: ReactNode }): JSX.Element {
  const lg = wide ? "minmax(0, 3fr) minmax(0, 2fr)" : `repeat(${cols}, minmax(0, 1fr))`;
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg }, gap: 2, alignItems: "stretch", mt: 2 }}>{children}</Box>;
}

/** A calm "nothing here" line, with a tick: an empty part of a dashboard is good news. */
export function Calm({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", color: "text.secondary", py: 1.5 }}>
      <Box sx={{ color: "success.main", display: "flex" }}>
        <CircleCheckIcon size={18} />
      </Box>
      <Typography variant="body2">{children}</Typography>
    </Stack>
  );
}

/** A compact figure tile. */
export function Kpi({ label, value, note }: { label: string; value: string; note?: string }): JSX.Element {
  return (
    <Card variant="outlined" sx={{ px: 1.75, py: 1.25 }}>
      <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 500 }}>{label}</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 650, fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>{value}</Typography>
      {note ? <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{note}</Typography> : null}
    </Card>
  );
}

export function KpiRow({ children }: { children: ReactNode }): JSX.Element {
  return <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 1.5 }}>{children}</Box>;
}

/** Waiting on You: a compact tile per queue; it opens the list on that queue. */
export function QueueTiles({ tiles }: { tiles: readonly { key: string; count: number; label: string; to?: string; hot: boolean; hint?: string }[] }): JSX.Element {
  // One row up to six tiles, then two even rows.
  const cols = tiles.length <= 6 ? tiles.length : Math.ceil(tiles.length / 2);
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: `repeat(${Math.min(2, cols)}, minmax(0, 1fr))`, md: `repeat(${cols}, minmax(0, 1fr))` },
        gap: 1.5,
      }}
    >
      {tiles.map((t) => (
        <ButtonBase
          key={t.key}
          // A queue with no screen behind it still shows its count, without a link.
          component={t.to ? RouterLink : "div"}
          to={t.to}
          disabled={!t.to}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 0.25,
            px: 1.75,
            py: 1.25,
            border: 1,
            borderColor: "divider",
            borderRadius: 1.5,
            bgcolor: "background.paper",
            textAlign: "left",
            "&:hover": { borderColor: "primary.main" },
          }}
        >
          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 650,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.15,
              color: t.count ? (t.hot ? "primary.dark" : "text.primary") : "text.disabled",
            }}
          >
            {n0(t.count)}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", fontWeight: 500 }}>{t.label}</Typography>
          {t.hint ? <Typography sx={{ fontSize: 11.5, color: "text.disabled", lineHeight: 1.3 }}>{t.hint}</Typography> : null}
        </ButtonBase>
      ))}
    </Box>
  );
}

/** Horizontal bars: a name, the bar, the figure (and its share). The top items, then Other. */
export function HBars({ rows, format = n0, percent = false, max = 8 }: { rows: readonly CountRow[]; format?: (n: number) => string; percent?: boolean; max?: number }): JSX.Element {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const shown = sorted.length <= max ? sorted : [...sorted.slice(0, max - 1), { label: "Other", count: sorted.slice(max - 1).reduce((s, r) => s + r.count, 0) }];
  const top = Math.max(1, ...shown.map((r) => r.count));
  const total = shown.reduce((s, r) => s + r.count, 0) || 1;
  return (
    <Stack spacing={1}>
      {shown.map((r) => (
        <Box key={r.label} sx={{ display: "grid", gridTemplateColumns: "minmax(110px, 200px) minmax(0, 1fr) auto", gap: 1.5, alignItems: "center" }}>
          <Typography sx={{ fontSize: 13 }} noWrap title={r.label}>
            {r.label}
          </Typography>
          <Box sx={{ height: 10, borderRadius: 5, bgcolor: "action.hover", overflow: "hidden" }}>
            <Box sx={{ height: "100%", width: `${(r.count / top) * 100}%`, bgcolor: "primary.main", borderRadius: 5 }} />
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right", minWidth: 56 }}>
            {format(r.count)}
            {percent ? (
              <Typography component="span" sx={{ fontSize: 11.5, color: "text.secondary", fontWeight: 400, ml: 0.375 }}>
                {/* A real space, for copy-paste and screen readers. */}
                {" "}
                {Math.round((r.count / total) * 100)}%
              </Typography>
            ) : null}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

/** Columns by month. */
export function MonthColumns({ rows, name }: { rows: readonly MonthValue[]; name: string }): JSX.Element {
  return (
    <BarChart
      data={rows.map((r) => ({ month: fmtMonth(r.month), [name]: r.value }))}
      xAxisDataKey="month"
      bars={[{ dataKey: name, name }]}
      height={220}
      maxBarSize={28}
      legend={{ show: false }}
      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
    />
  );
}

/** Stacked columns by month, several series. */
export function StackedMonths({ rows, series }: { rows: readonly Record<string, number | string>[]; series: readonly { key: string; name: string }[] }): JSX.Element {
  return (
    <BarChart
      data={[...rows]}
      xAxisDataKey="month"
      bars={series.map((s) => ({ dataKey: s.key, name: s.name, stackId: "cost" }))}
      height={240}
      maxBarSize={28}
      legend={{ show: true, align: "left", verticalAlign: "bottom" }}
      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
    />
  );
}

/** A row in a dashboard list: the date, what it is, and a status on the right. */
export function DateRow({ date, title, lines, right, to }: { date: string; title: string; lines: readonly string[]; right?: ReactNode; to?: string }): JSX.Element {
  const [, m, d] = date.split("-").map(Number);
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][(m || 1) - 1];
  const body = (
    <>
      <Box sx={{ width: 46, height: 50, borderRadius: 1.5, border: 1, borderColor: "divider", display: "grid", placeItems: "center", flexShrink: 0, lineHeight: 1 }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.1 }}>{d}</Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{month}</Typography>
        </Box>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <Typography sx={{ fontWeight: 600, fontSize: 13.5, overflowWrap: "anywhere" }}>{title}</Typography>
        {lines.filter(Boolean).map((l) => (
          <Typography key={l} sx={{ fontSize: 12.5, color: "text.secondary" }}>
            {l}
          </Typography>
        ))}
      </Box>
      {right ? <Stack sx={{ alignItems: "flex-end", gap: 0.5, flexShrink: 0 }}>{right}</Stack> : null}
    </>
  );
  const sx = { display: "flex", alignItems: "center", gap: 1.5, py: 1.25, borderTop: 1, borderColor: "divider", width: "100%", "&:first-of-type": { borderTop: 0 } };
  return to ? (
    <ButtonBase component={RouterLink} to={to} sx={sx}>
      {body}
    </ButtonBase>
  ) : (
    <Box sx={sx}>{body}</Box>
  );
}

export function ViewAll({ to }: { to: string }): JSX.Element {
  return (
    <Button size="small" component={RouterLink} to={to}>
      View All
    </Button>
  );
}
