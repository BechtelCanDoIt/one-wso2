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

import { useState } from "react";
import { Box, ButtonBase, Typography } from "@wso2/oxygen-ui";
import { useSearchParams } from "react-router";
import type { DashboardCampaigns } from "../../api/amplifyTypes";
import { useDashboardCampaigns } from "../../api/useAmplifyDashboards";
import AmplifyShell from "../../components/AmplifyShell";
import { Bar, Block, BoardState, Empty, SectionLabel } from "../../components/DashboardParts";
import { commentedReposts, num, plainReposts, updatedStamp } from "../../util/dashboardFormat";
import CampaignDetailDialog from "./CampaignDetailDialog";

/** Post performance: reposts per post (a click opens the post's popup) and reposts by category. */
export function PostPerformanceBoard({
  data,
  onSelect,
  detailOpen = false,
  onCloseDetail = () => undefined,
}: {
  data: DashboardCampaigns;
  /** A post name was clicked: select it (and open its popup). */
  onSelect: (campaignId: string) => void;
  /** Show the popup for `data.selected`. */
  detailOpen?: boolean;
  onCloseDetail?: () => void;
}) {
  const topReposts = Math.max(1, ...data.campaigns.map((p) => p.reposts));
  const topCategory = Math.max(1, ...data.byCategory.map((c) => c.reposts));
  const sel = data.selected;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {updatedStamp(data.asOf)} · last {data.windowDays} days
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start" }}>
        <Box sx={{ flex: "1 1 520px", minWidth: 0 }}>
          <Block title="Reposts per post">
            {data.campaigns.length === 0 ? (
              <Empty>No posts in this window.</Empty>
            ) : (
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {data.campaigns.map((p) => (
                  <Box component="li" key={p.campaignId} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                    <ButtonBase
                      onClick={() => onSelect(p.campaignId)}
                      aria-haspopup="dialog"
                      sx={{ width: "100%", display: "flex", alignItems: "center", gap: 1.5, py: 1.25, textAlign: "left", flexWrap: "wrap" }}
                    >
                      <Box sx={{ flex: "0 0 230px", minWidth: 150 }}>
                        {p.title}
                        <Typography variant="body2" color="text.secondary" component="div">
                          {p.categoryLabel}
                          {p.isPriority ? " · Priority" : ""}
                        </Typography>
                      </Box>
                      <Bar fraction={p.reposts / topReposts} label={`${p.reposts} reposts`} />
                      <Box sx={{ flex: "0 0 40px", textAlign: "right" }}>{num(p.reposts)}</Box>
                    </ButtonBase>
                  </Box>
                ))}
              </Box>
            )}
          </Block>
        </Box>

        <Box sx={{ flex: "1 1 360px", minWidth: 0 }}>
          <Block title={`Reposts by category, ${data.windowDays} days`}>
            {data.byCategory.length === 0 ? (
              <Empty>No reposts in this window.</Empty>
            ) : (
              <Box
                role="table"
                aria-label="Reposts by category"
                sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", columnGap: 2, rowGap: 0.5, fontSize: 13, alignItems: "center" }}
              >
                <Box role="row" sx={{ display: "contents" }}>
                  <Box role="columnheader" />
                  <Box role="columnheader" sx={{ textAlign: "right" }}>
                    <SectionLabel>Reposts</SectionLabel>
                  </Box>
                  <Box role="columnheader" sx={{ textAlign: "right" }}>
                    <SectionLabel>With comments</SectionLabel>
                  </Box>
                </Box>
                {data.byCategory.map((c) => (
                  <Box role="row" key={c.code} sx={{ display: "contents" }}>
                    <Box role="cell" sx={{ gridColumn: "1 / -1", mt: 1, display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Bar fraction={c.reposts / topCategory} label={`${c.label}: ${c.reposts} reposts in all`} />
                    </Box>
                    <Box role="rowheader" sx={{ overflowWrap: "anywhere" }}>
                      {c.label}
                    </Box>
                    <Box role="cell" sx={{ textAlign: "right" }}>
                      {num(plainReposts(c))}
                    </Box>
                    <Box role="cell" sx={{ textAlign: "right" }}>
                      {num(commentedReposts(c))}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
              The bar is every repost, with or without a comment.
            </Typography>
          </Block>
        </Box>
      </Box>
      {detailOpen && sel && <CampaignDetailDialog sel={sel} onClose={onCloseDetail} />}
    </Box>
  );
}

export default function PostPerformancePage() {
  const [params, setParams] = useSearchParams();
  const campaignId = params.get("campaignId") ?? undefined;
  // Open state lives here, not in the board: picking another post swaps the data and the board remounts.
  const [detailOpen, setDetailOpen] = useState(false);
  const q = useDashboardCampaigns(campaignId);
  return (
    <AmplifyShell title="Post Performance" subtitle="Which posts people are reposting, and how fast.">
      <BoardState queries={[q]}>
        {q.data && (
          <PostPerformanceBoard
            data={q.data}
            onSelect={(id) => {
              setParams({ campaignId: id }, { replace: true });
              setDetailOpen(true);
            }}
            detailOpen={detailOpen}
            onCloseDetail={() => setDetailOpen(false)}
          />
        )}
      </BoardState>
    </AmplifyShell>
  );
}
