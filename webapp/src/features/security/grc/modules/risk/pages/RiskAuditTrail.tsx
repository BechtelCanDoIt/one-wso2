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

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { type JSX, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuthApiClient } from "@features/security/grc/shim/useAuthApiClient";
import { fetchAuditTrail, type AuditTrailEntry } from "../api/riskApi";
import { entryToSentence } from "./risk-registers/historyText";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;

// The change-log actions a reader can filter on; the value is what the backend
// stores. Unknown actions still render (see actionLabel), they just are not
// offered as a filter.
const ACTION_LABELS: Record<string, string> = {
  CREATE: "Created",
  UPDATE: "Edited",
  SUBMIT: "Submitted",
  APPROVE: "Approved",
  REJECT: "Rejected",
  ESCALATE: "Escalated",
  COMMENT: "Escalation reviewed",
  ASSESS: "Reassessed",
  COMPLETE: "Completed",
  CLOSE: "Closed",
  CANCEL: "Cancelled",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ").toLowerCase();
}

// Actors that are not people: the daily escalation job writes "system", and the
// risk register migration tool writes "risk-sheet-migration". Neither is in the
// identity directory, so they are named here rather than shown as raw markers.
const SYSTEM_ACTORS: Record<string, string> = {
  system: "System",
  "risk-sheet-migration": "Risk sheet migration",
};

function actorLabel(e: AuditTrailEntry): string {
  if (SYSTEM_ACTORS[e.created_by]) return SYSTEM_ACTORS[e.created_by];
  return e.created_by_name || e.created_by_email || e.created_by;
}

// Risk Hub > Audit Trail: every change to the risks the caller can see, newest
// first. The backend decides which risks those are (the same rule as the
// register list), so this page only filters and pages what it is given.
export default function RiskAuditTrail(): JSX.Element {
  const authFetch = useAuthApiClient();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<AuditTrailEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const loadSeqRef = useRef(0);
  const isFiltered = action !== "" || from !== "" || to !== "" || search !== "";

  // Typing into the search box should not fire a request per keystroke.
  useEffect(() => {
    if (searchInput === search) return;
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput, search]);

  useEffect(() => {
    // Responses can arrive out of order when filters change quickly; only the
    // latest request may write state.
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError(null);
    fetchAuditTrail(authFetch, {
      from: from || undefined,
      to: to || undefined,
      actions: action ? [action] : undefined,
      search: search || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((resp) => {
        if (seq !== loadSeqRef.current) return;
        setEntries(resp.items);
        setTotal(resp.total);
      })
      .catch((e) => {
        if (seq !== loadSeqRef.current) return;
        setError(e instanceof Error && e.message ? e.message : "Failed to load the audit trail.");
      })
      .finally(() => {
        if (seq !== loadSeqRef.current) return;
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, from, to, search, page, reloadKey]);

  const clearFilters = () => {
    setAction("");
    setFrom("");
    setTo("");
    setSearchInput("");
    setSearch("");
    setPage(0);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Audit Trail
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Who changed what across the risk registers you can see
        </Typography>
      </Box>

      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Risk"
          placeholder="Code or title"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <Select
          size="small"
          displayEmpty
          value={action}
          onChange={(e: SelectChangeEvent) => {
            setAction(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 170 }}
          inputProps={{ "aria-label": "Action" }}
        >
          <MenuItem value="">All actions</MenuItem>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
        <TextField
          label="From"
          type="date"
          size="small"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(0);
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(0);
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        {isFiltered && (
          <Button size="small" onClick={clearFilters} sx={{ textTransform: "none", color: "text.secondary" }}>
            Clear filters
          </Button>
        )}
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Risk</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Changed by</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>What changed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={22} />
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {isFiltered ? "No changes match the selected filters." : "No changes recorded yet."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              entries.map((e) => {
                const { title, body } = entryToSentence(e);
                return (
                  <TableRow key={e.id}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{new Date(e.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Link
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={() => navigate(`/security/risk/registers?riskId=${e.risk_id}`)}
                        sx={{ textAlign: "left", fontWeight: 600 }}
                      >
                        {e.risk_code}
                      </Link>
                      <Typography variant="caption" color="text.secondary" component="div" sx={{ maxWidth: 280 }} noWrap>
                        {e.risk_title}
                      </Typography>
                    </TableCell>
                    <TableCell>{actorLabel(e)}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" label={actionLabel(e.action)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {title}
                      </Typography>
                      {body && (
                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                          {body}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
        {total > 0 && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_, p) => setPage(p)}
          />
        )}
      </TableContainer>
    </Box>
  );
}
