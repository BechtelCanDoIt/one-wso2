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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { ChevronDownIcon, ChevronRightIcon, SearchIcon } from "@wso2/oxygen-ui-icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { reversePoints } from "../api/amplifyClient";
import type { LedgerEntry, TeamPageEntry } from "../api/amplifyTypes";
import { AMPLIFY_QUERY_KEYS, useAmplifyTeam, useAmplifyTeamHistory } from "../api/amplifyHooks";
import AmplifyShell, { AmplifyEmpty, AmplifyStat } from "../components/AmplifyShell";
import AmplifySectionCard from "../components/AmplifySectionCard";
import PointsAdjustDialog from "../components/PointsAdjustDialog";
import { amplifyBtnSx, formatDate, relativeTime } from "../components/amplifyUi";

const SORTS = [
  { value: "points", label: "Points (high to low)" },
  { value: "recent", label: "Most recent activity" },
  { value: "name", label: "Name" },
];

/**
 * Team — the roster with points, and the PO's correction tools on it.
 *
 * Adjust and Reverse are shown only when the backend says the caller may do
 * them (`entry.actions`) AND the gate says they hold a reviewing role — the
 * two must agree, and the backend is the enforcer either way. A row expands to
 * its ledger, because a correction is almost always "you gave me the wrong
 * points on that one", which needs the entry, not just the total.
 */
export default function AmplifyTeamPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("points");
  const [period, setPeriod] = useState("ALL");
  const query = useAmplifyTeam({ period, q: q || undefined, sort, size: 50 });

  return (
    <AmplifyShell title="Team" subtitle="Who's amplifying, and how much.">
      {(gate) => {
        const canReview = gate.isPo || gate.isAdmin;
        const data = query.data;

        return (
          <Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
              <TextField
                size="small"
                placeholder="Search by name or email"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                slotProps={{ input: { startAdornment: <SearchIcon size={16} /> } }}
                sx={{ minWidth: 260 }}
              />
              <TextField select size="small" label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} sx={{ minWidth: 200 }}>
                {SORTS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select size="small" label="Period" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ minWidth: 160 }}>
                <MenuItem value="ALL">All time</MenuItem>
                <MenuItem value="MONTH">This month</MenuItem>
                <MenuItem value="QUARTER">This quarter</MenuItem>
              </TextField>
            </Stack>

            {query.isError ? (
              <Alert severity="error">{describeError(query.error)}</Alert>
            ) : query.isPending ? (
              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: 2 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Loading the team…
                </Typography>
              </Stack>
            ) : data && data.teamStatus !== "OK" ? (
              <AmplifyEmpty>
                {data.teamStatus === "NO_TEAM"
                  ? "You're not on a team, so there's nothing to show."
                  : "Team standings are temporarily unavailable."}
              </AmplifyEmpty>
            ) : (
              <AmplifySectionCard
                title="Roster"
                caption={data ? `${data.total} ${data.total === 1 ? "person" : "people"}` : undefined}
              >
                {data && (
                  <Stack direction="row" spacing={4} sx={{ mb: 2, flexWrap: "wrap", rowGap: 2 }}>
                    <AmplifyStat label="Headcount" value={data.summary.headcount ?? "—"} />
                    <AmplifyStat label="Active" value={data.summary.activeCount ?? "—"} />
                  </Stack>
                )}
                {(data?.entries.length ?? 0) === 0 ? (
                  <AmplifyEmpty>Nobody matches that search.</AmplifyEmpty>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 40 }} />
                        <TableCell>Name</TableCell>
                        <TableCell align="right">Points</TableCell>
                        <TableCell align="right">Rank</TableCell>
                        <TableCell>Last activity</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data?.entries ?? []).map((entry) => (
                        <TeamRow key={entry.employeeId} entry={entry} canReview={canReview} />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AmplifySectionCard>
            )}
          </Box>
        );
      }}
    </AmplifyShell>
  );
}

function TeamRow({ entry, canReview }: { entry: TeamPageEntry; canReview: boolean }) {
  const [open, setOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const history = useAmplifyTeamHistory(entry.employeeId, { enabled: open });

  const showAdjust = canReview && entry.actions.canAdjust;
  const showReverse = canReview && entry.actions.canReverse;

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen((v) => !v)} aria-label={open ? "Collapse" : "Expand"}>
            {open ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {entry.displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {entry.email}
          </Typography>
        </TableCell>
        <TableCell align="right">{entry.points}</TableCell>
        <TableCell align="right">#{entry.rank}</TableCell>
        <TableCell>{relativeTime(entry.lastActivityAt)}</TableCell>
        <TableCell align="right">
          {showAdjust ? (
            <Button size="small" variant="outlined" onClick={() => setAdjustOpen(true)} sx={amplifyBtnSx}>
              Adjust
            </Button>
          ) : (
            <Typography variant="caption" color="text.disabled">
              —
            </Typography>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0, borderBottom: open ? undefined : "none" }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 1 }}>
              {history.isPending ? (
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <CircularProgress size={14} />
                  <Typography variant="caption" color="text.secondary">
                    Loading history…
                  </Typography>
                </Stack>
              ) : history.isError ? (
                <Alert severity="error">{describeError(history.error)}</Alert>
              ) : (history.data?.items.length ?? 0) === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No ledger entries yet.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>When</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell align="right">Points</TableCell>
                      {showReverse && <TableCell align="right" />}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(history.data?.items ?? []).map((e) => (
                      <LedgerRow key={e.reference} entry={e} employeeId={entry.employeeId} showReverse={showReverse} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      {showAdjust && (
        <PointsAdjustDialog
          open={adjustOpen}
          employeeId={entry.employeeId}
          employeeName={entry.displayName}
          onClose={() => setAdjustOpen(false)}
        />
      )}
    </>
  );
}

function LedgerRow({
  entry,
  employeeId,
  showReverse,
}: {
  entry: LedgerEntry;
  employeeId: string;
  showReverse: boolean;
}) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();
  const [busy, setBusy] = useState(false);

  const handleReverse = async () => {
    const reason = window.prompt(`Why are you reversing ${entry.points} points?`);
    if (!reason || !reason.trim()) return;
    setBusy(true);
    try {
      const token = await getAccessToken();
      await reversePoints(token, entry.reference, reason.trim());
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.team });
      void queryClient.invalidateQueries({ queryKey: ["amplify-team-history", employeeId] });
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.poDashboard });
      showSuccess("Reversal recorded.");
    } catch (err) {
      showError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TableRow>
      <TableCell>{formatDate(entry.createdAt)}</TableCell>
      <TableCell>
        <Chip size="small" variant="outlined" label={entry.action ?? entry.sourceType} />
      </TableCell>
      <TableCell>{entry.reason ?? "—"}</TableCell>
      <TableCell align="right">{entry.points > 0 ? `+${entry.points}` : entry.points}</TableCell>
      {showReverse && (
        <TableCell align="right">
          <Button size="small" onClick={handleReverse} disabled={busy} sx={amplifyBtnSx}>
            Reverse
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}
