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
  TablePagination,
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
import { useIdempotencyKey } from "../api/idempotency";
import type { LedgerEntry, TeamPageEntry } from "../api/amplifyTypes";
import { AMPLIFY_QUERY_KEYS, useAmplifyTeam, useAmplifyTeamHistory } from "../api/amplifyHooks";
import AmplifyShell, { AmplifyEmpty, AmplifyStat } from "../components/AmplifyShell";
import AmplifySectionCard from "../components/AmplifySectionCard";
import AmplifyPeriodPicker from "../components/AmplifyPeriodPicker";
import PointsAdjustDialog from "../components/PointsAdjustDialog";
import { amplifyBtnSx, formatDate, relativeTime } from "../components/amplifyUi";

/** The backend's `sort` enum (`service.bal`: `rank | points | name`). */
const SORTS = [
  { value: "rank", label: "Rank (best first)" },
  { value: "points", label: "Points (high to low)" },
  { value: "name", label: "Name (A–Z)" },
];

const ROWS_PER_PAGE = [10, 25, 50, 100];

/**
 * Team — the roster with points, and the PO's correction tools on it.
 *
 * Adjust and Reverse are gated on the backend's own per-row `actions` field
 * (only `amplify_po` gets `true`), never on the role alone — the backend is the
 * enforcer, and a row it would refuse must not offer the button. A row expands
 * to its ledger, because a correction is almost always "you gave me the wrong
 * points on that one", which needs the entry, not just the total.
 */
export default function AmplifyTeamPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("rank");
  const [period, setPeriod] = useState("ALL");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const query = useAmplifyTeam({ period, q: q || undefined, sort, page, size });

  return (
    <AmplifyShell title="Team" subtitle="Who's amplifying, and how much.">
      {() => {
        const data = query.data;

        return (
          <Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 2, flexWrap: "wrap", rowGap: 2 }}
            >
              <TextField
                size="small"
                placeholder="Search by name or email"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                slotProps={{
                  input: { startAdornment: <SearchIcon size={16} /> },
                  htmlInput: { maxLength: 100, "aria-label": "Search the team by name or email" },
                }}
                sx={{ minWidth: 260 }}
              />
              <TextField
                select
                size="small"
                label="Sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(0);
                }}
                sx={{ minWidth: 200 }}
              >
                {SORTS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
              <AmplifyPeriodPicker
                value={period}
                onChange={(p) => {
                  setPeriod(p);
                  setPage(0);
                }}
              />
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
                  <>
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
                          <TeamRow key={entry.employeeId} entry={entry} />
                        ))}
                      </TableBody>
                    </Table>
                    <TablePagination
                      component="div"
                      count={data?.total ?? 0}
                      page={page}
                      rowsPerPage={size}
                      rowsPerPageOptions={ROWS_PER_PAGE}
                      onPageChange={(_, next) => setPage(next)}
                      onRowsPerPageChange={(e) => {
                        setSize(Number(e.target.value));
                        setPage(0);
                      }}
                    />
                  </>
                )}
              </AmplifySectionCard>
            )}
          </Box>
        );
      }}
    </AmplifyShell>
  );
}

function TeamRow({ entry }: { entry: TeamPageEntry }) {
  const [open, setOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const history = useAmplifyTeamHistory(entry.employeeId, { enabled: open });

  // The backend's per-row `actions` is the source of truth (PO only), not the
  // role alone: a row the backend would refuse must not offer the button.
  const showAdjust = entry.actions.canAdjust;
  const showReverse = entry.actions.canReverse;

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
  // Same reference + same reason after a timeout replays; a reversal is
  // once-per-row server-side, but a replay reads as success, not ALREADY_REVERSED.
  const idempotency = useIdempotencyKey();

  // A reversal row cannot itself be reversed (CANNOT_REVERSE_REVERSAL), and a
  // row that has been reversed already says so on its reversal — offer the
  // button only where the backend would accept it.
  const reversible = showReverse && entry.sourceType !== "REVERSAL";

  const handleReverse = async () => {
    const reason = window.prompt(`Why are you reversing ${entry.points} points?`);
    if (!reason || !reason.trim()) return;
    setBusy(true);
    const key = idempotency.keyFor({ reference: entry.reference, reason: reason.trim() });
    try {
      const token = await getAccessToken();
      await reversePoints(token, entry.reference, reason.trim(), key);
      idempotency.settle();
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.team });
      void queryClient.invalidateQueries({ queryKey: ["amplify-team-history", employeeId] });
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.poDashboard });
      showSuccess("Reversal recorded.");
    } catch (err) {
      idempotency.settle(err);
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
          {reversible && (
            <Button size="small" onClick={handleReverse} disabled={busy} sx={amplifyBtnSx}>
              Reverse
            </Button>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
