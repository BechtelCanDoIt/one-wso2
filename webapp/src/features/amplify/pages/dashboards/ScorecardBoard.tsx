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

import { Box, Typography } from "@wso2/oxygen-ui";
import type { DashboardScorecard } from "../../api/amplifyTypes";
import { useDashboardScorecard } from "../../api/useAmplifyDashboards";
import AmplifyShell from "../../components/AmplifyShell";
import { Block, BoardState, Empty, StateChip } from "../../components/DashboardParts";
import { updatedStamp, fraction, measureValue, targetText } from "../../util/dashboardFormat";

/** Each measure against its target. Status comes from the API; nothing is recomputed here. */
export function ScorecardBoard({ data }: { data: DashboardScorecard }) {
  const onTrack = data.measures.filter((m) => m.status === "ON_TRACK").length;
  const watch = data.measures.length - onTrack;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {updatedStamp(data.asOf)}
      </Typography>
      <Block
        title="Participation measures"
        action={
          data.measures.length > 0 && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <StateChip label={`${onTrack} on track`} tone="info" />
              {watch > 0 && <StateChip label={`${watch} watch`} tone="warning" />}
            </Box>
          )
        }
      >
        {data.measures.length === 0 ? (
          <Empty>No measures yet.</Empty>
        ) : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {data.measures.map((m) => {
              const detail = fraction(m);
              return (
                <Box
                  component="li"
                  key={m.key}
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 1.5,
                    py: 1.75,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ flex: "1 1 220px", minWidth: 0 }}>
                    {m.label}
                    <Typography variant="body2" color="text.secondary" component="div">
                      {targetText(m)}
                      {m.note ? ` · ${m.note}` : ""}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: "0 0 170px", fontSize: 20, fontWeight: 600 }}>
                    {measureValue(m)}
                    {detail && (
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1, fontWeight: 400 }}
                      >
                        {detail}
                      </Typography>
                    )}
                  </Box>
                  <StateChip
                    label={m.status === "ON_TRACK" ? "On track" : "Watch"}
                    tone={m.status === "ON_TRACK" ? "info" : "warning"}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </Block>
    </Box>
  );
}

export default function ScorecardPage() {
  const q = useDashboardScorecard();
  return (
    <AmplifyShell title="Scorecard" subtitle="How participation is tracking against its targets.">
      <BoardState queries={[q]}>{q.data && <ScorecardBoard data={q.data} />}</BoardState>
    </AmplifyShell>
  );
}
