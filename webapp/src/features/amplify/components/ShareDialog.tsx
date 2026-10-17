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
  MenuItem,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { useQueryClient } from "@tanstack/react-query";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { amplifyProblemCode, shareCampaign } from "../api/amplifyClient";
import { useIdempotencyKey } from "../api/idempotency";
import { AMPLIFY_PROBLEM, type ConnectionStatus, type ShareKind } from "../api/amplifyTypes";
import { AMPLIFY_QUERY_KEYS } from "../api/amplifyHooks";
import { amplifyBtnSx, canPostWith, formatDate } from "./amplifyUi";
import type { PendingShare } from "./shareFlow";

/** `ShareCommand.commentary` maxLength in the contract. */
export const COMMENTARY_MAX = 3000;

const KIND_OPTIONS: { value: ShareKind; label: string; needsCommentary: boolean }[] = [
  { value: "REPOST", label: "Repost", needsCommentary: false },
  { value: "REPOST_COMMENTARY", label: "Repost with your thoughts", needsCommentary: true },
  { value: "SHARE", label: "Share", needsCommentary: false },
  { value: "SHARE_COMMENTARY", label: "Share with your thoughts", needsCommentary: true },
];

/**
 * Pick how to amplify a campaign, then publish the share.
 *
 * The dialog is deliberately dumb about LinkedIn: it asks the caller's status
 * up front and hands off to the connect prompt (via `onNeedConnect`) rather
 * than firing a share it knows will be refused. The problem-code branch below
 * is the belt to that braces — a status that read ACTIVE a second ago can
 * still come back NEEDS_RECONNECT, and that must route into the same connect
 * flow rather than surface as a raw error.
 *
 * Idempotency: one key per (dialog-open, request body). A retry of the same
 * share after a timeout reuses it; changing the kind or the commentary, or a
 * 4xx answer (which the backend stores against the key), mints a new one.
 */
export default function ShareDialog({
  open,
  campaign,
  linkedInStatus,
  linkedInExpiresAt,
  onClose,
  onNeedConnect,
  onShared,
  initial,
  skipConnectionCheck = false,
}: {
  open: boolean;
  campaign: { id: string; title: string };
  linkedInStatus: ConnectionStatus | undefined;
  linkedInExpiresAt?: string | null;
  onClose: () => void;
  onNeedConnect: (pending: PendingShare) => void;
  onShared: () => void;
  initial?: { kind: ShareKind; commentary?: string };
  /** Right after a connect, before /me catches up: let the server decide. */
  skipConnectionCheck?: boolean;
}) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showSuccess } = useNotifications();
  const [kind, setKind] = useState<ShareKind>(initial?.kind ?? "REPOST");
  const [commentary, setCommentary] = useState(initial?.commentary ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotency = useIdempotencyKey();

  useEffect(() => {
    if (!open) return;
    setKind(initial?.kind ?? "REPOST");
    setCommentary(initial?.commentary ?? "");
    setError(null);
    idempotency.reset();
    // `initial` is intentionally not a dependency: it seeds the dialog on open,
    // it does not drive it while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const needsCommentary = KIND_OPTIONS.find((o) => o.value === kind)?.needsCommentary ?? false;
  const blocked = needsCommentary && commentary.trim().length === 0;
  const expiring = linkedInStatus === "EXPIRING";

  const pendingShare = (): PendingShare => ({
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    kind,
    commentary: needsCommentary ? commentary.trim() : undefined,
    returnTo: window.location.pathname,
  });

  const handleSubmit = async () => {
    const pending = pendingShare();

    if (!skipConnectionCheck && !canPostWith(linkedInStatus)) {
      onNeedConnect(pending);
      return;
    }

    setSubmitting(true);
    setError(null);
    const command = { kind, commentary: pending.commentary };
    const key = idempotency.keyFor({ campaignId: campaign.id, ...command });
    try {
      const token = await getAccessToken();
      await shareCampaign(token, campaign.id, command, key);
      idempotency.settle();
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.myShares });
      showSuccess(`Share queued for “${campaign.title}”.`);
      onShared();
    } catch (err) {
      idempotency.settle(err);
      const code = amplifyProblemCode(err);
      if (code === AMPLIFY_PROBLEM.linkedinNotConnected || code === AMPLIFY_PROBLEM.needsReconnect) {
        onNeedConnect(pending);
        return;
      }
      if (code === AMPLIFY_PROBLEM.commentaryRequired) {
        setError("This share needs a comment. Add one and try again.");
        return;
      }
      if (code === AMPLIFY_PROBLEM.duplicateAction) {
        setError("You've already amplified this campaign.");
        return;
      }
      if (code === AMPLIFY_PROBLEM.campaignClosed) {
        setError("This campaign has closed, so it can't be shared any more.");
        return;
      }
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Amplify “{campaign.title}”</DialogTitle>
      <DialogContent>
        {expiring && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => onNeedConnect(pendingShare())} sx={amplifyBtnSx}>
                Reconnect
              </Button>
            }
          >
            Your LinkedIn connection expires
            {linkedInExpiresAt ? ` on ${formatDate(linkedInExpiresAt)}` : " soon"}. You can still share now —
            reconnect when you have a moment so it keeps working.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          This posts on your LinkedIn, as you. Adding your own thoughts earns more points.
        </Typography>
        <TextField
          select
          fullWidth
          size="small"
          label="How"
          value={kind}
          onChange={(e) => setKind(e.target.value as ShareKind)}
          sx={{ mt: 1 }}
        >
          {KIND_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          multiline
          minRows={3}
          size="small"
          label={needsCommentary ? "Your thoughts (required)" : "Your thoughts (optional)"}
          value={commentary}
          onChange={(e) => setCommentary(e.target.value)}
          slotProps={{ htmlInput: { maxLength: COMMENTARY_MAX } }}
          helperText={
            needsCommentary
              ? `This share type must carry a comment. ${commentary.length}/${COMMENTARY_MAX}`
              : "Only used by the “with your thoughts” share types."
          }
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting} sx={amplifyBtnSx}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting || blocked} sx={amplifyBtnSx}>
          {submitting ? "Sharing…" : "Share"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
