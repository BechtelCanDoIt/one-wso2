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
import { Box, Tooltip, Typography } from "@wso2/oxygen-ui";
import type { RoleLoad } from "../api/insightsTypes";
import { useInsightsPalette } from "./insightsPalette";
import { BarRow, Legend, Swatch } from "./BarParts";

/**
 * Where quotes are waiting (v2): a slim bar per role, as long as its share of
 * the busiest role, split by deadline; hover for the split.
 */
export default function WaitingByRole({ data }: { readonly data: readonly RoleLoad[] }): JSX.Element {
  const c = useInsightsPalette();
  if (data.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
        Nothing is waiting for approval.
      </Typography>
    );
  }
  const max = Math.max(...data.map((r) => r.onTrack + r.dueSoon + r.overdue));
  return (
    <Box>
      <Box sx={{ display: "grid", gap: 1.75 }}>
        {data.map((r) => {
          const total = r.onTrack + r.dueSoon + r.overdue;
          const seg = (n: number, color: string) =>
            n > 0 ? <Box sx={{ width: `${(n / max) * 100}%`, bgcolor: color, height: "100%" }} /> : null;
          const split = `${r.onTrack} on track · ${r.dueSoon} due soon · ${r.overdue} overdue`;
          return (
            <BarRow
              key={r.role}
              name={r.label}
              note={r.regions.length ? r.regions.join(", ") : undefined}
              figure={total}
              bar={
                <Tooltip title={split} placement="top">
                  <Box
                    aria-label={`${r.label}: ${split}`}
                    sx={{ height: 16, bgcolor: c.track, borderRadius: 1, overflow: "hidden", display: "flex" }}
                  >
                    {seg(r.onTrack, c.ok)}
                    {seg(r.dueSoon, c.soon)}
                    {seg(r.overdue, c.late)}
                  </Box>
                </Tooltip>
              }
            />
          );
        })}
      </Box>
      <Legend
        items={[
          { label: "On track", swatch: <Swatch color={c.ok} /> },
          { label: "Due soon", swatch: <Swatch color={c.soon} /> },
          { label: "Overdue", swatch: <Swatch color={c.late} /> },
        ]}
        aside={
          <Typography variant="caption" color="text.secondary">
            Hover a bar for the split
          </Typography>
        }
      />
    </Box>
  );
}
