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

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { ExternalLinkIcon } from "@wso2/oxygen-ui-icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { useNotifications } from "@context/notifications/NotificationsContext";
import {
  approveExternalShare,
  markExternalShareAmplified,
  rejectExternalShare,
} from "../api/amplifyClient";
import type { ExternalShare, ExternalShareStatus } from "../api/amplifyTypes";
import { AMPLIFY_QUERY_KEYS, useAmplifyPoExternalShares } from "../api/amplifyHooks";
import AmplifySectionCard from "../components/AmplifySectionCard";
import { amplifyBtnSx, externalShareStatusColor, formatDateTime } from "../components/amplifyUi";

const FILTERS: { value: ExternalShareStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "AMPLIFIED", label: "Amplified" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

/**
 * The external-share queue. Approve, reject (with a reason — the claimant sees
 * it), or mark an approved one as amplified once it has actually run.
 */
export default function AmplifyPoReviewTab() {
  const [status, setStatus] = useState<ExternalShareStatus | "ALL">("PENDING");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [rejecting, setRejecting] = useState<ExternalShare | undefined>(undefined);

  const query = useAmplifyPoExternalShares({ status, page, size });

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: "center" }}>
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ExternalShareStatus | "ALL");
            setPage(0);
          }}
          sx={{ minWidth: 180 }}
        >
          {FILTERS.map((f) => (
            <MenuItem key={f.value} value={f.value}>
              {f.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <AmplifySectionCard title="Claims">
        {query.isError ? (
          <Alert severity="error">{describeError(query.error)}</Alert>
        ) : query.isPending ? (
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading claims…
            </Typography>
          </Stack>
        ) : (query.data?.items.length ?? 0) === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nothing here.
          </Typography>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Evidence</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Claimed</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(query.data?.items ?? []).map((s) => (
                  <ReviewRow key={s.id} share={s} onReject={() => setRejecting(s)} />
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={query.data?.total ?? 0}
              page={page}
              onPageChange={(_e, p) => setPage(p)}
              rowsPerPage={size}
              onRowsPerPageChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[25, 50, 100]}
            />
          </>
        )}
      </AmplifySectionCard>

      <RejectDialog share={rejecting} onClose={() => setRejecting(undefined)} />
    </Box>
  );
}

function ReviewRow({ share, onReject }: { share: ExternalShare; onReject: () => void }) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.poExternalShares });
    void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.poDashboard });
    void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.leaderboard });
  };

  const run = async (action: (token: string) => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      const token = await getAccessToken();
      await action(token);
      refresh();
      showSuccess(message);
    } catch (err) {
      showError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2">{share.employeeId}</Typography>
        <Typography variant="caption" color="text.secondary">
          {share.evidenceProvider}
        </Typography>
      </TableCell>
      <TableCell sx={{ maxWidth: 300 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", minWidth: 0 }}>
          <ExternalLinkIcon size={14} />
          <Typography
            variant="body2"
            component="a"
            href={share.evidenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "inherit" }}
          >
            {share.evidenceUrl}
          </Typography>
        </Stack>
      </TableCell>
      <TableCell>
        <Chip size="small" color={externalShareStatusColor(share.status)} label={share.status} />
      </TableCell>
      <TableCell>{formatDateTime(share.createdAt)}</TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
          {share.status === "PENDING" && (
            <>
              <Button
                size="small"
                variant="contained"
                disabled={busy}
                onClick={() => run((t) => approveExternalShare(t, share.id), "Approved.")}
                sx={amplifyBtnSx}
              >
                Approve
              </Button>
              <Button size="small" color="error" disabled={busy} onClick={onReject} sx={amplifyBtnSx}>
                Reject
              </Button>
            </>
          )}
          {share.status === "APPROVED" && (
            <Button
              size="small"
              variant="outlined"
              disabled={busy}
              onClick={() => run((t) => markExternalShareAmplified(t, share.id), "Marked amplified.")}
              sx={amplifyBtnSx}
            >
              Mark amplified
            </Button>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );
}

function RejectDialog({ share, onClose }: { share?: ExternalShare; onClose: () => void }) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const handleReject = async () => {
    if (!share) return;
    if (!reason.trim()) return;
    setBusy(true);
    try {
      const token = await getAccessToken();
      await rejectExternalShare(token, share.id, reason.trim());
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.poExternalShares });
      showSuccess("Rejected.");
      setReason("");
      onClose();
    } catch (err) {
      showError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(share)} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Reject this claim?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The reason is shown to the claimant, so make it specific.
        </Typography>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} sx={amplifyBtnSx}>
          Cancel
        </Button>
        <Button
          onClick={handleReject}
          color="error"
          variant="contained"
          disabled={busy || !reason.trim()}
          sx={amplifyBtnSx}
        >
          {busy ? "Rejecting…" : "Reject"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
