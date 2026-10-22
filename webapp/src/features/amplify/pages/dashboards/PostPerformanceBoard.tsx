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

import { Box, ButtonBase, Typography } from "@wso2/oxygen-ui";
import { useSearchParams } from "react-router";
import type { DashboardCampaigns } from "../../api/amplifyTypes";
import { useDashboardCampaigns } from "../../api/useAmplifyDashboards";
import AmplifyShell from "../../components/AmplifyShell";
import { Bar, Block, BoardState, Empty, PriorityPill, SectionLabel } from "../../components/DashboardParts";
import { announcementLabel, commentedReposts, plainReposts, updatedStamp, num, rate, shortDate } from "../../util/dashboardFormat";

function DayChart({ byDay }: { byDay: { day: number; reposts: number }[] }) {
  const max = Math.max(1, ...byDay.map((d) => d.reposts));
  const w = 400 / Math.max(1, byDay.length);
  const label = byDay.map((d) => `day ${d.day}: ${d.reposts}`).join(", ");
  return (
    <svg viewBox="0 0 400 110" role="img" aria-label={`Reposts per day. ${label}`} style={{ width: "100%", height: "auto" }}>
      <line x1="0" y1="100" x2="400" y2="100" stroke="currentColor" strokeOpacity="0.25" />
      {byDay.map((d, i) => {
        const h = (d.reposts / max) * 88;
        return <rect key={d.day} x={i * w + w * 0.15} y={100 - h} width={w * 0.7} height={h} rx="4" fill="#60A5FA" />;
      })}
    </svg>
  );
}

/** Post performance: reposts per post, the selected post's first seven days, reposts by category. */
export function PostPerformanceBoard({
  data,
  onSelect,
  picked = false,
}: {
  data: DashboardCampaigns;
  onSelect: (campaignId: string) => void;
  /** True once the reader chose a campaign; until then the API shows the one with the most reposts. */
  picked?: boolean;
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
                      aria-pressed={sel?.campaignId === p.campaignId}
                      sx={{ width: "100%", display: "flex", alignItems: "center", gap: 1.5, py: 1.25, textAlign: "left", flexWrap: "wrap" }}
                    >
                      <Box sx={{ flex: "0 0 230px", minWidth: 150, fontWeight: sel?.campaignId === p.campaignId ? 700 : 400 }}>
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

        <Box sx={{ flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <Block title="Campaign detail">
            {!sel ? (
              <Empty>Pick a campaign on the left to see its first seven days.</Empty>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mt: -1, mb: 1.5 }}>
                  {picked
                    ? "Showing the campaign you picked."
                    : "Showing the campaign with the most reposts. Click any campaign on the left to change it."}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography sx={{ fontSize: 18 }}>{sel.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {sel.categoryLabel} · opened {shortDate(sel.opensAt)} · closes {shortDate(sel.closesAt)}
                    </Typography>
                  </Box>
                  {sel.isPriority && <PriorityPill />}
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 1.5, mt: 2 }}>
                  <Box>
                    <SectionLabel>Reposts</SectionLabel>
                    <Typography sx={{ fontSize: 26, fontWeight: 600 }}>{num(plainReposts(sel))}</Typography>
                  </Box>
                  <Box>
                    <SectionLabel>Reposts/Comments</SectionLabel>
                    <Typography sx={{ fontSize: 26, fontWeight: 600 }}>{num(commentedReposts(sel))}</Typography>
                  </Box>
                  <Box>
                    <SectionLabel>Share of connected</SectionLabel>
                    <Typography sx={{ fontSize: 26, fontWeight: 600 }}>{sel.shareOfConnected == null ? "-" : rate(sel.shareOfConnected)}</Typography>
                  </Box>
                  <Box>
                    <SectionLabel>First 24h</SectionLabel>
                    <Typography sx={{ fontSize: 26, fontWeight: 600 }}>{num(sel.first24Hours)}</Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <SectionLabel>Reposts per day</SectionLabel>
                  <DayChart byDay={sel.byDay} />
                  <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "text.secondary" }}>
                    {sel.byDay.map((d) => (
                      <span key={d.day}>Day {d.day}</span>
                    ))}
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Novera: {announcementLabel(sel.announcement)}
                </Typography>
              </>
            )}
          </Block>
          <Block title={`Reposts by category, ${data.windowDays} days`}>
            {data.byCategory.length === 0 ? (
              <Empty>No reposts in this window.</Empty>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, fontSize: 13 }}>
                {data.byCategory.map((c) => (
                  <Box key={c.code} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    <Box sx={{ flex: "0 0 90px" }}>{c.label}</Box>
                    <Bar fraction={c.reposts / topCategory} label={`${c.reposts} reposts`} />
                    <Box sx={{ flex: "0 0 160px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {num(c.reposts)} ({num(commentedReposts(c))} with comments)
                    </Box>
                  </Box>
                ))}
                <Typography variant="caption" color="text.secondary">
                  Reposts include reposts with comments.
                </Typography>
              </Box>
            )}
          </Block>
        </Box>
      </Box>
    </Box>
  );
}

export default function PostPerformancePage() {
  const [params, setParams] = useSearchParams();
  const campaignId = params.get("campaignId") ?? undefined;
  const q = useDashboardCampaigns(campaignId);
  return (
    <AmplifyShell title="Post Performance" subtitle="Which posts people are reposting, and how fast.">
      <BoardState queries={[q]}>
        {q.data && <PostPerformanceBoard data={q.data} onSelect={(id) => setParams({ campaignId: id }, { replace: true })} picked={campaignId !== undefined} />}
      </BoardState>
    </AmplifyShell>
  );
}
