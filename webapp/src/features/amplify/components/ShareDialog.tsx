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
} from "@wso2/oxygen-ui";
import { useQueryClient } from "@tanstack/react-query";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { amplifyProblemCode, newIdempotencyKey, shareCampaign } from "../api/amplifyClient";
import { AMPLIFY_PROBLEM, type ConnectionStatus, type ShareKind } from "../api/amplifyTypes";
import { AMPLIFY_QUERY_KEYS } from "../api/amplifyHooks";
import { amplifyBtnSx } from "./amplifyUi";
import type { PendingShare } from "./shareFlow";

const KIND_OPTIONS: { value: ShareKind; label: string; needsCommentary: boolean }[] = [
  { value: "REPOST", label: "Repost", needsCommentary: false },
  { value: "REPOST_COMMENTARY", label: "Repost with commentary", needsCommentary: true },
  { value: "SHARE", label: "Share", needsCommentary: false },
  { value: "SHARE_COMMENTARY", label: "Share with commentary", needsCommentary: true },
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
 */
export default function ShareDialog({
  open,
  campaign,
  linkedInStatus,
  onClose,
  onNeedConnect,
  onShared,
  initial,
}: {
  open: boolean;
  campaign: { id: string; title: string };
  linkedInStatus: ConnectionStatus | undefined;
  onClose: () => void;
  onNeedConnect: (pending: PendingShare) => void;
  onShared: () => void;
  initial?: { kind: ShareKind; commentary?: string };
}) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showSuccess } = useNotifications();
  const [kind, setKind] = useState<ShareKind>(initial?.kind ?? "REPOST");
  const [commentary, setCommentary] = useState(initial?.commentary ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The same logical share may be retried after a transient failure, so its
  // key is minted once per dialog-open (ADR-024) rather than per attempt.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  useEffect(() => {
    if (!open) return;
    setKind(initial?.kind ?? "REPOST");
    setCommentary(initial?.commentary ?? "");
    setError(null);
    setIdempotencyKey(newIdempotencyKey());
    // `initial` is intentionally not a dependency: it seeds the dialog on open,
    // it does not drive it while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const needsCommentary = KIND_OPTIONS.find((o) => o.value === kind)?.needsCommentary ?? false;
  const blocked = needsCommentary && commentary.trim().length === 0;

  const handleSubmit = async () => {
    const pending: PendingShare = {
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      kind,
      commentary: needsCommentary ? commentary.trim() : undefined,
      returnTo: window.location.pathname,
    };

    if (linkedInStatus && linkedInStatus !== "ACTIVE") {
      onNeedConnect(pending);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const token = await getAccessToken();
      await shareCampaign(
        token,
        campaign.id,
        { kind, commentary: pending.commentary },
        idempotencyKey,
      );
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.myShares });
      showSuccess(`Share queued for “${campaign.title}”.`);
      onShared();
    } catch (err) {
      const code = amplifyProblemCode(err);
      if (code === AMPLIFY_PROBLEM.linkedinNotConnected || code === AMPLIFY_PROBLEM.needsReconnect) {
        onNeedConnect(pending);
        return;
      }
      if (code === AMPLIFY_PROBLEM.commentaryRequired) {
        setError("This share needs a comment. Add one and try again.");
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
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
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
          label={needsCommentary ? "Commentary (required)" : "Commentary (optional)"}
          value={commentary}
          onChange={(e) => setCommentary(e.target.value)}
          helperText={
            needsCommentary
              ? "This share type must carry a comment."
              : "Only used by the “with commentary” share types."
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
