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
// KIND, either express or implied. See the License for the specific
// language governing permissions and limitations under the License.

import { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@wso2/oxygen-ui";
import { MedalIcon, TrophyIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useAmplifyLeaderboard, useAmplifyMyPoints, useAmplifyMyShares } from "../api/amplifyHooks";
import type { LeaderboardEntry, PersonalStanding, TeamEntry } from "../api/amplifyTypes";
import AmplifyShell, { AmplifyEmpty, AmplifyStat } from "../components/AmplifyShell";
import AmplifySectionCard from "../components/AmplifySectionCard";
import AmplifyPeriodPicker from "../components/AmplifyPeriodPicker";
import { formatDateTime, formatMonthLabel, formatPeriodLabel, rankDelta } from "../components/amplifyUi";

/**
 * The Leaderboard: the company podium, where you stand, your team, and your
 * month-by-month history beside your own shares — the numbers and the activity
 * that produced them on one screen, so "why am I ranked here" has an answer
 * two inches away rather than in another tab.
 */
export default function AmplifyLeaderboardPage() {
  const [period, setPeriod] = useState("ALL");
  const board = useAmplifyLeaderboard(period);
  const points = useAmplifyMyPoints(period);
  const shares = useAmplifyMyShares();

  return (
    <AmplifyShell title="Leaderboard" subtitle="How the company is doing, and where you stand.">
      {(gate) => (
        <Box>
          <Box sx={{ mb: 2.5 }}>
            <AmplifyPeriodPicker value={period} onChange={setPeriod} />
          </Box>

          {board.isError ? (
            <ErrorNotice error={board.error} onRetry={() => board.refetch()} retrying={board.isFetching}>
              Couldn't load the leaderboard.
            </ErrorNotice>
          ) : board.isPending ? (
            <Spinner label="Loading the leaderboard…" />
          ) : board.data ? (
            <Stack spacing={2.5}>
              <Podium entries={board.data.company} topN={board.data.topN} period={formatPeriodLabel(period)} />
              <MyStanding standing={board.data.me} displayName={gate.me?.employee.display_name} />

              <AmplifySectionCard
                title="My team"
                caption={
                  board.data.myTeam
                    ? `${board.data.myTeam.teamName} · ${board.data.myTeam.activeCount} of ${board.data.myTeam.headcount} active`
                    : undefined
                }
              >
                <TeamBlock
                  status={board.data.teamStatus}
                  entries={board.data.myTeam?.entries ?? []}
                />
              </AmplifySectionCard>

              <AmplifySectionCard title="My monthly history">
                {points.isError ? (
                  <ErrorNotice error={points.error} onRetry={() => points.refetch()}>
                    Couldn't load your monthly points.
                  </ErrorNotice>
                ) : points.isPending ? (
                  <Spinner label="Loading your monthly points…" />
                ) : (points.data?.monthly.length ?? 0) === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No points history yet.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell align="right">Actions</TableCell>
                        <TableCell align="right">Points</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(points.data?.monthly ?? []).map((m) => (
                        <TableRow key={m.month}>
                          <TableCell>{formatMonthLabel(m.month)}</TableCell>
                          <TableCell align="right">{m.actions}</TableCell>
                          <TableCell align="right">{m.points}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AmplifySectionCard>

              <AmplifySectionCard title="Your shares" caption="Everything you have amplified, newest first.">
                {shares.isError ? (
                  <ErrorNotice error={shares.error} onRetry={() => shares.refetch()}>
                    Couldn't load your shares.
                  </ErrorNotice>
                ) : shares.isPending ? (
                  <Spinner label="Loading your shares…" />
                ) : (shares.data?.items.length ?? 0) === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    You haven't amplified anything yet.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Campaign</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Requested</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(shares.data?.items ?? []).map((s) => (
                        <TableRow key={s.id}>
                          <TableCell sx={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.campaignId}
                          </TableCell>
                          <TableCell>{s.kind.replace(/_/g, " ").toLowerCase()}</TableCell>
                          <TableCell>
                            <Chip size="small" label={s.status} />
                          </TableCell>
                          <TableCell>{formatDateTime(s.requestedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AmplifySectionCard>
            </Stack>
          ) : null}
        </Box>
      )}
    </AmplifyShell>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: 2 }}>
      <CircularProgress size={16} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}

function Podium({ entries, topN, period }: { entries: LeaderboardEntry[]; topN: number; period: string }) {
  if (entries.length === 0) {
    return <AmplifyEmpty>No standings yet for this period.</AmplifyEmpty>;
  }
  return (
    <AmplifySectionCard
      title={`Company top ${topN}`}
      caption={`Everyone chasing the same campaigns · ${period}.`}
      action={<TrophyIcon size={18} />}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "stretch" }}>
        {entries.slice(0, 3).map((e, i) => (
          <PodiumCard key={e.employeeId} entry={e} place={i + 1} />
        ))}
      </Stack>
      {entries.length > 3 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Table size="small">
            <TableBody>
              {entries.slice(3).map((e) => (
                <LeaderRow key={e.employeeId} entry={e} />
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </AmplifySectionCard>
  );
}

const PLACE_COLOR = ["#d4af37", "#a8a8a8", "#b08d57"] as const;

function PodiumCard({ entry, place }: { entry: LeaderboardEntry; place: number }) {
  const delta = rankDelta(entry.rank, entry.previousRank);
  return (
    <Box
      sx={{
        flex: 1,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        p: 2,
        textAlign: "center",
        borderTopWidth: 3,
        borderTopColor: PLACE_COLOR[place - 1] ?? "divider",
      }}
    >
      <MedalIcon size={22} style={{ color: PLACE_COLOR[place - 1] }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }} noWrap>
        {entry.displayName}
      </Typography>
      <Typography variant="h5" sx={{ my: 0.5 }}>
        {entry.points}
      </Typography>
      <Chip
        size="small"
        variant="outlined"
        color={delta.dir === "up" ? "success" : delta.dir === "down" ? "error" : "default"}
        label={delta.label}
      />
    </Box>
  );
}

function LeaderRow({ entry }: { entry: LeaderboardEntry }) {
  const delta = rankDelta(entry.rank, entry.previousRank);
  return (
    <TableRow>
      <TableCell sx={{ width: 48 }}>{entry.rank}</TableCell>
      <TableCell>{entry.displayName}</TableCell>
      <TableCell align="right">{entry.points}</TableCell>
      <TableCell align="right" sx={{ width: 72 }}>
        <Typography
          variant="caption"
          color={delta.dir === "up" ? "success.main" : delta.dir === "down" ? "error.main" : "text.secondary"}
        >
          {delta.label}
        </Typography>
      </TableCell>
    </TableRow>
  );
}

function MyStanding({ standing, displayName }: { standing: PersonalStanding; displayName?: string }) {
  const delta = rankDelta(standing.rank, standing.previousRank);
  return (
    <AmplifySectionCard title="Your standing" caption={displayName}>
      <Stack direction="row" spacing={4} sx={{ flexWrap: "wrap", rowGap: 2 }}>
        <AmplifyStat label="Points" value={standing.points ?? 0} />
        <AmplifyStat label="Rank" value={standing.rank ? `#${standing.rank}` : "—"} />
        <AmplifyStat label="Movement" value={delta.label} />
        <AmplifyStat
          label="To next rank"
          value={standing.pointsToNextRank ?? "—"}
        />
        <AmplifyStat
          label="To top of board"
          value={standing.pointsToTopN ?? "—"}
        />
      </Stack>
      {standing.inTopN && (
        <Alert severity="success" icon={false} sx={{ mt: 2 }}>
          You're on the company board this period. Nice.
        </Alert>
      )}
    </AmplifySectionCard>
  );
}

function TeamBlock({ status, entries }: { status: string; entries: TeamEntry[] }) {
  if (status === "NO_TEAM") {
    return (
      <Typography variant="body2" color="text.secondary">
        You're not on a team, or your team has no members listed.
      </Typography>
    );
  }
  if (status === "UNAVAILABLE") {
    return (
      <Typography variant="body2" color="text.secondary">
        Team standings are temporarily unavailable.
      </Typography>
    );
  }
  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No team standings yet for this period.
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Team rank</TableCell>
          <TableCell>Member</TableCell>
          <TableCell align="right">Points</TableCell>
          <TableCell align="right">Company rank</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.employeeId} selected={e.isMe}>
            <TableCell>{e.teamRank}</TableCell>
            <TableCell>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                  {e.displayName.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2">
                  {e.displayName}
                  {e.isMe ? " (you)" : ""}
                </Typography>
              </Stack>
            </TableCell>
            <TableCell align="right">{e.points}</TableCell>
            <TableCell align="right">#{e.companyRank}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
