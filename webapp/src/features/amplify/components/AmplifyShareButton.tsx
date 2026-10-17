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
import {
  clearPendingShare,
  consumeConnectResult,
  loadPendingShare,
  savePendingShare,
  CONNECT_RESULT_STORAGE_KEY,
  type PendingShare,
} from "./shareFlow";

/**
 * The Amplify button that starts a share, and the connect flow that has to
 * happen first when LinkedIn is not connected.
 *
 * The flow, end to end:
 *
 *   1. Share → ShareDialog. If LinkedIn is connected, it publishes.
 *   2. Not connected → this component swaps to a connect prompt. "Connect"
 *      asks the backend for an authorization URL and opens it in a NEW TAB,
 *      remembering the half-finished share first.
 *   3. That tab finishes the handshake, writes a result, and closes.
 *   4. This tab hears the storage event, refreshes /me, and — once LinkedIn
 *      reads ACTIVE — reopens the SAME share dialog with the reader's kind and
 *      commentary intact. They press Share once and it lands.
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
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const linkedInStatus = gate.me?.linkedin.status;

  // Reopen the interrupted share once LinkedIn lands. Reads the handoff the
  // callback tab wrote, then clears it so a later mount does not replay it.
  const resumeFromPending = useCallback(
    (result: { status: "ok" | "error"; message?: string } | null) => {
      const saved = loadPendingShare();
      gate.retry();
      if (result?.status === "error") {
        clearPendingShare();
        setConnectError(result.message ?? "LinkedIn connection failed.");
        setConnectOpen(true);
        return;
      }
      if (!saved) return;
      setResume({ kind: saved.kind, commentary: saved.commentary });
      setPending(saved);
      setConnectOpen(false);
      setShareOpen(true);
    },
    [gate],
  );

  useEffect(() => {
    const result = consumeConnectResult();
    if (result) resumeFromPending(result);
    // Only on mount for this button; the storage listener below covers later
    // handoffs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CONNECT_RESULT_STORAGE_KEY) return;
      resumeFromPending(consumeConnectResult());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [resumeFromPending]);

  // The connect tab cannot always reach this tab (some browsers only fire
  // `storage` on other tabs, not always reliably); focus is the backstop — the
  // reader comes back to this window and we re-read.
  const wasConnecting = useRef(false);
  useEffect(() => {
    const onFocus = () => {
      if (!wasConnecting.current) return;
      const result = consumeConnectResult();
      wasConnecting.current = false;
      resumeFromPending(result);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [resumeFromPending]);

  const handleNeedConnect = (share: PendingShare) => {
    setPending(share);
    savePendingShare(share);
    setShareOpen(false);
    setConnectError(null);
    setConnectOpen(true);
  };

  const handleConnect = async () => {
    setConnecting(true);
    setConnectError(null);
    wasConnecting.current = true;
    try {
      const token = await getAccessToken();
      const auth = await startLinkedInConnect(token, {
        returnTo: window.location.pathname,
        pendingCampaignId: pending?.campaignId,
      });
      const opened = window.open(auth.authorizationUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        // Popup blocked — tell the reader rather than leaving them waiting.
        setConnectError("Your browser blocked the LinkedIn window. Allow pop-ups for One WSO2 and try again.");
        wasConnecting.current = false;
      }
    } catch (err) {
      setConnectError(describeError(err));
      wasConnecting.current = false;
    } finally {
      setConnecting(false);
    }
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
        initial={resume}
        onClose={() => setShareOpen(false)}
        onNeedConnect={handleNeedConnect}
        onShared={() => {
          clearPendingShare();
          setPending(null);
          setResume(undefined);
          setShareOpen(false);
          gate.retry();
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
