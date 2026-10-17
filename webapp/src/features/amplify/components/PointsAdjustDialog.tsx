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

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@wso2/oxygen-ui";
import { useQueryClient } from "@tanstack/react-query";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { adjustPoints } from "../api/amplifyClient";
import { useIdempotencyKey } from "../api/idempotency";
import { AMPLIFY_QUERY_KEYS } from "../api/amplifyHooks";
import { amplifyBtnSx } from "./amplifyUi";

/** `PointsAdjustment.points`: a signed integer, not zero, within ±10000. */
export const ADJUST_LIMIT = 10000;

/**
 * The PO's manual point correction. Points are signed and a reason is
 * mandatory — an adjustment with no reason is indistinguishable from a bug six
 * months later, and the ledger keeps both forever.
 *
 * One Idempotency-Key per dialog-open and body: a re-click after a timeout
 * (the server may already have written the row) replays rather than writing a
 * second ledger row; editing the points or the reason mints a fresh key, as
 * does a success.
 */
export default function PointsAdjustDialog({
  open,
  employeeId,
  employeeName,
  onClose,
}: {
  open: boolean;
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showSuccess } = useNotifications();
  const [points, setPoints] = useState("10");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotency = useIdempotencyKey();

  useEffect(() => {
    if (!open) return;
    setPoints("10");
    setReason("");
    setError(null);
    idempotency.reset();
  }, [open, idempotency]);

  const handleSubmit = async () => {
    const value = Number(points);
    if (!Number.isInteger(value) || value === 0 || Math.abs(value) > ADJUST_LIMIT) {
      setError(`Enter a whole, non-zero number of points up to ±${ADJUST_LIMIT} (negative to deduct).`);
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required — it's what the ledger shows later.");
      return;
    }
    setBusy(true);
    setError(null);
    const adjustment = { employeeId, points: value, reason: reason.trim() };
    const key = idempotency.keyFor(adjustment);
    try {
      const token = await getAccessToken();
      await adjustPoints(token, adjustment, key);
      idempotency.settle();
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.team });
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.poDashboard });
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.leaderboard });
      showSuccess(`Adjusted ${employeeName} by ${value > 0 ? "+" : ""}${value}.`);
      onClose();
    } catch (err) {
      idempotency.settle(err);
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Adjust points — {employeeName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Points"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            helperText="Negative to deduct."
          />
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            label="Reason"
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} sx={amplifyBtnSx}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={busy} sx={amplifyBtnSx}>
          {busy ? "Saving…" : "Adjust"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
