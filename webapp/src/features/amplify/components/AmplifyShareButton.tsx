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

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@wso2/oxygen-ui";
import { Share2Icon } from "@wso2/oxygen-ui-icons-react";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { startLinkedInConnect } from "../api/amplifyClient";
import type { AmplifyGate } from "../api/useAmplifyGate";
import type { Campaign, ShareKind } from "../api/amplifyTypes";
import { amplifyBtnSx } from "./amplifyUi";
import ShareDialog from "./ShareDialog";
import { openLinkedInConsent, POPUP_BLOCKED_MESSAGE } from "./openLinkedInConsent";
import {
  clearPendingShare,
  consumeConnectResult,
  loadPendingShare,
  savePendingShare,
  CONNECT_RESULT_STORAGE_KEY,
  type ConnectResult,
  type PendingShare,
} from "./shareFlow";

/**
 * The Amplify button that starts a share, and the connect flow that has to
 * happen first when LinkedIn is not connected.
 *
 * The flow, end to end:
 *
 *   1. Share → ShareDialog. If LinkedIn can post (ACTIVE or EXPIRING), it
 *      publishes.
 *   2. Not connected → this component swaps to a connect prompt. "Connect"
 *      opens a tab inside the click, asks the backend for an authorization URL
 *      and points the tab at it, remembering the half-finished share first.
 *   3. That tab finishes the handshake, writes a result, and closes.
 *   4. This tab hears the storage event, refreshes /me, and reopens the SAME
 *      share dialog with the reader's kind and commentary intact. They press
 *      Share once and it lands.
 *
 * Only the button whose campaign the pending share names reacts — the Posts
 * page renders one of these per card, and every one of them hears the same
 * storage event. Without that check each card reopened its own dialog.
 *
 * The dialog is reopened rather than auto-published on purpose: the reader
 * walked away mid-action, and completing a share they did not press the button
 * for is not ours to do.
 */
export default function AmplifyShareButton({
  campaign,
  gate,
  variant = "contained",
  size = "small",
  fullWidth = false,
}: {
  campaign: Pick<Campaign, "id" | "title">;
  gate: AmplifyGate;
  variant?: "text" | "outlined" | "contained";
  size?: "small" | "medium";
  fullWidth?: boolean;
}) {
  const getAccessToken = useAccessToken();

  const [shareOpen, setShareOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [pending, setPending] = useState<PendingShare | null>(null);
  const [resume, setResume] = useState<{ kind: ShareKind; commentary?: string } | undefined>(undefined);
  // True right after a successful connect: /me may not have caught up yet, so
  // the dialog lets the server decide rather than bouncing back to connect.
  const [justConnected, setJustConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Set while this button's connect tab is out; arms the focus fallback.
  const wasConnecting = useRef(false);

  const linkedInStatus = gate.me?.linkedin.status;
  const { retry: refreshGate } = gate;

  // Reopen the interrupted share once LinkedIn lands. Acts only when the
  // pending share is THIS button's campaign; consumes the one-shot result.
  const tryResume = useCallback((): boolean => {
    const saved = loadPendingShare();
    if (!saved || saved.campaignId !== campaign.id) return false;
    const result: ConnectResult | null = consumeConnectResult();
    if (!result) return false;
    refreshGate();
    if (result.status === "error") {
      clearPendingShare();
      setConnectError(result.message ?? "LinkedIn connection failed.");
      setConnectOpen(true);
      return true;
    }
    setResume({ kind: saved.kind, commentary: saved.commentary });
    setPending(saved);
    setJustConnected(true);
    setConnectOpen(false);
    setShareOpen(true);
    return true;
  }, [campaign.id, refreshGate]);

  // A reload of the original tab while the connect tab was finishing.
  useEffect(() => {
    tryResume();
    // Only on mount; the listeners below cover later handoffs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CONNECT_RESULT_STORAGE_KEY || e.newValue === null) return;
      if (tryResume()) wasConnecting.current = false;
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [tryResume]);

  // `storage` is the main signal; focus is the backstop for a browser that
  // drops it — the reader comes back to this window and we re-read. A focus
  // with no result yet (they came back before finishing) just refreshes /me
  // and keeps waiting.
  useEffect(() => {
    const onFocus = () => {
      if (!wasConnecting.current) return;
      if (tryResume()) wasConnecting.current = false;
      else refreshGate();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [tryResume, refreshGate]);

  const handleNeedConnect = (share: PendingShare) => {
    setPending(share);
    savePendingShare(share);
    setShareOpen(false);
    setConnectError(null);
    setConnectOpen(true);
  };

  // Not async on purpose: openLinkedInConsent opens the tab synchronously,
  // inside this click, before any await.
  const handleConnect = () => {
    setConnecting(true);
    setConnectError(null);
    wasConnecting.current = true;
    // Re-save so the TTL counts from the moment LinkedIn opens.
    if (pending) savePendingShare(pending);
    void openLinkedInConsent(async () => {
      const token = await getAccessToken();
      const auth = await startLinkedInConnect(token, {
        returnTo: pending?.returnTo ?? window.location.pathname,
        pendingCampaignId: pending?.campaignId ?? campaign.id,
      });
      return auth.authorizationUrl;
    }).then((outcome) => {
      if (outcome.status === "blocked") {
        setConnectError(POPUP_BLOCKED_MESSAGE);
        wasConnecting.current = false;
      } else if (outcome.status === "failed") {
        setConnectError(describeError(outcome.error));
        wasConnecting.current = false;
      }
      setConnecting(false);
    });
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        startIcon={<Share2Icon size={16} />}
        onClick={() => {
          setResume(undefined);
          setJustConnected(false);
          setShareOpen(true);
        }}
        sx={amplifyBtnSx}
      >
        Amplify
      </Button>

      <ShareDialog
        open={shareOpen}
        campaign={campaign}
        linkedInStatus={linkedInStatus}
        linkedInExpiresAt={gate.me?.linkedin.expires_at}
        initial={resume}
        skipConnectionCheck={justConnected}
        onClose={() => {
          setShareOpen(false);
          setJustConnected(false);
        }}
        onNeedConnect={handleNeedConnect}
        onShared={() => {
          clearPendingShare();
          setPending(null);
          setResume(undefined);
          setJustConnected(false);
          setShareOpen(false);
          refreshGate();
        }}
      />

      <Dialog open={connectOpen} onClose={connecting ? undefined : () => setConnectOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Connect LinkedIn to amplify</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {campaign.title ? `To share “${campaign.title}”, ` : ""}
              One WSO2 needs your LinkedIn connection. We open LinkedIn in a new
              tab, and bring you straight back here — your share picks up where
              you left it.
            </Typography>
            {connectError && <Alert severity="error">{connectError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectOpen(false)} disabled={connecting} sx={amplifyBtnSx}>
            Not now
          </Button>
          <Button onClick={handleConnect} variant="contained" disabled={connecting} sx={amplifyBtnSx}>
            {connecting ? "Opening…" : "Connect LinkedIn"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
