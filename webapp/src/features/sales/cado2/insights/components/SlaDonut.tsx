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

import type { JSX } from "react";
import { Box, Stack, Typography } from "@wso2/oxygen-ui";
import { useInsightsPalette } from "./insightsPalette";

const R = 15.915; // a circumference of 100, so each arc is its percentage

/** Every approval waiting on someone now, by deadline: on track, due soon, overdue (v2). */
export default function SlaDonut({
  onTrack,
  dueSoon,
  overdue,
}: {
  readonly onTrack: number;
  readonly dueSoon: number;
  readonly overdue: number;
}): JSX.Element {
  const c = useInsightsPalette();
  const total = onTrack + dueSoon + overdue;
  const parts = [
    { key: "On track", n: onTrack, color: c.ok },
    { key: "Due soon", n: dueSoon, color: c.soon },
    { key: "Overdue", n: overdue, color: c.late },
  ];
  let start = 0;
  return (
    <Stack sx={{ alignItems: "center" }}>
      <Box sx={{ position: "relative", width: 180, height: 180 }}>
        <svg viewBox="0 0 42 42" width="180" height="180" role="img" aria-label={`${total} approvals waiting: ${onTrack} on track, ${dueSoon} due soon, ${overdue} overdue`}>
          <circle cx="21" cy="21" r={R} fill="none" stroke={c.track} strokeWidth="3.5" />
          {total > 0
            ? parts.map((p) => {
                const pct = (p.n / total) * 100;
                const arc = (
                  <circle
                    key={p.key}
                    cx="21"
                    cy="21"
                    r={R}
                    fill="none"
                    stroke={p.color}
                    strokeWidth="3.5"
                    strokeDasharray={`${pct} ${100 - pct}`}
                    // Starts at the top and runs clockwise.
                    strokeDashoffset={25 - start}
                  />
                );
                start += pct;
                return p.n > 0 ? arc : null;
              })
            : null}
        </svg>
        <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
          <Box>
            <Typography sx={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{total}</Typography>
            <Typography variant="caption" color="text.secondary">
              approvals waiting
            </Typography>
          </Box>
        </Box>
      </Box>
      <Stack spacing={1} sx={{ width: "100%", mt: 2.25 }}>
        {parts.map((p) => (
          <Stack key={p.key} direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: p.color }} />
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              {p.key}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {p.n}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
