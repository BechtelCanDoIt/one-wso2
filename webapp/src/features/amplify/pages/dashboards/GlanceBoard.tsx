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
import type { DashboardGlance, GroupBoardEntry, LeaderboardEntry } from "../../api/amplifyTypes";
import { useAmplifyLeaderboard } from "../../api/useAmplifyData";
import { useDashboardGlance, useGroupBoard } from "../../api/useAmplifyDashboards";
import AmplifyShell from "../../components/AmplifyShell";
import { Block, BoardState, Empty, StatCard } from "../../components/DashboardParts";
import { asOfText, changePercent, num, percentOf, shortDate } from "../../util/dashboardFormat";

function WeeklyLine({ weekly }: { weekly: DashboardGlance["weekly"] }) {
  if (weekly.length === 0) return <Empty>No reposts recorded yet.</Empty>;
  const max = Math.max(1, ...weekly.map((w) => w.reposts));
  const step = weekly.length > 1 ? 500 / (weekly.length - 1) : 0;
  const pts = weekly.map((w, i) => [10 + i * step, 130 - (w.reposts / max) * 108] as const);
  const last = pts[pts.length - 1];
  const label = weekly.map((w) => `week of ${shortDate(w.weekStart)}: ${w.reposts}`).join(", ");
  return (
    <>
      <svg
        viewBox="0 0 520 150"
        role="img"
        aria-label={`Weekly reposts. ${label}`}
        style={{ width: "100%", height: "auto" }}
      >
        <line x1="0" y1="130" x2="520" y2="130" stroke="currentColor" strokeOpacity="0.25" />
        <polyline
          points={pts.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="#60A5FA"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={last[0]} cy={last[1]} r="6" fill="#FF7300" />
      </svg>
      <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "text.secondary" }}>
        <span>Week of {shortDate(weekly[0].weekStart)}</span>
        <span>This week · {num(weekly[weekly.length - 1].reposts)}</span>
      </Box>
    </>
  );
}

function RankedList({ rows }: { rows: { id: string; rank: number; name: string; points: number }[] }) {
  return (
    <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
      {rows.map((r) => (
        <Box component="li" key={r.id} sx={{ display: "flex", gap: 1.5 }}>
          <Box sx={{ flex: "0 0 20px", fontWeight: 600, color: r.rank === 1 ? "primary.main" : "text.secondary" }}>
            {r.rank}
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>{r.name}</Box>
          <Box sx={{ fontWeight: 600 }}>{num(r.points)}</Box>
        </Box>
      ))}
    </Box>
  );
}

/** At a glance: the one screen for a leadership check-in. */
export function GlanceBoard({
  data,
  people,
  teams,
}: {
  data: DashboardGlance;
  people: LeaderboardEntry[];
  teams: GroupBoardEntry[];
}) {
  const t = data.campaignsReachingTarget;
  const success = data.shareSuccess;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {asOfText(data.asOf)} · {data.month}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "stretch" }}>
        <Box sx={{ flex: "2 1 520px", minWidth: 0 }}>
          <Block title="Employee reposts of WSO2 posts">
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 1.5 }}>
              <Typography sx={{ fontSize: 52, fontWeight: 600, lineHeight: 1 }}>{num(data.reposts.thisMonth)}</Typography>
              <Typography color="text.secondary">
                this month, {changePercent(data.reposts.thisMonth, data.reposts.previousMonth)} on last month (
                {num(data.reposts.previousMonth)})
              </Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
              <WeeklyLine weekly={data.weekly} />
            </Box>
          </Block>
        </Box>
        <Box sx={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <StatCard
            label="Employees participating"
            value={num(data.participants)}
            detail={
              data.headcount
                ? `of ${num(data.headcount)} · ${percentOf(data.participants, data.headcount)} of the company`
                : undefined
            }
          />
          <StatCard
            label="Posts live"
            value={num(data.campaignsLive)}
            detail={`${num(t.reached)} of ${num(t.live)} reached ${t.thresholdPercent}% of connected`}
          />
          <StatCard
            label="Share success, 7 days"
            value={percentOf(success.published, success.attempts)}
            detail={`${num(success.published)} of ${num(success.attempts)} attempts published`}
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "stretch" }}>
        <Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
          <Block title="Top 3 people · all time">
            {people.length === 0 ? (
              <Empty>No points yet.</Empty>
            ) : (
              <RankedList
                rows={people.slice(0, 3).map((p) => ({ id: p.employeeId, rank: p.rank, name: p.displayName, points: p.points }))}
              />
            )}
          </Block>
        </Box>
        <Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
          <Block title="Top 3 teams">
            {teams.length === 0 ? (
              <Empty>No teams to show.</Empty>
            ) : (
              <RankedList rows={teams.slice(0, 3).map((e) => ({ id: e.key, rank: e.rank, name: e.name, points: e.points }))} />
            )}
          </Block>
        </Box>
        <Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
          <Block title="Best post this month">
            {data.bestCampaign ? (
              <>
                <Typography sx={{ fontSize: 17 }}>{data.bestCampaign.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.bestCampaign.categoryLabel}
                  {data.bestCampaign.isPriority ? " · priority" : ""}
                </Typography>
                <Typography sx={{ fontSize: 30, fontWeight: 600, mt: 1.5 }}>
                  {num(data.bestCampaign.reposts)}{" "}
                  <Typography component="span" color="text.secondary">
                    reposts
                  </Typography>
                </Typography>
              </>
            ) : (
              <Empty>No reposts this month yet.</Empty>
            )}
          </Block>
        </Box>
      </Box>
    </Box>
  );
}

export default function GlancePage() {
  const glance = useDashboardGlance();
  const board = useAmplifyLeaderboard();
  const teams = useGroupBoard("TEAM");
  return (
    <AmplifyShell title="At A Glance" subtitle="One screen for the leadership check-in.">
      <BoardState queries={[glance]}>
        {glance.data && (
          <GlanceBoard data={glance.data} people={board.data?.company ?? []} teams={teams.data?.entries ?? []} />
        )}
      </BoardState>
    </AmplifyShell>
  );
}
