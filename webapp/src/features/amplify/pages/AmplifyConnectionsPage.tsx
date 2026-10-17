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
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@wso2/oxygen-ui";
import { LinkedinIcon } from "@wso2/oxygen-ui-icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { disconnectLinkedIn, startLinkedInConnect } from "../api/amplifyClient";
import { AMPLIFY_QUERY_KEYS } from "../api/amplifyHooks";
import AmplifyShell from "../components/AmplifyShell";
import AmplifySectionCard from "../components/AmplifySectionCard";
import { amplifyBtnSx, connectionStatusColor, connectionStatusLabel, formatDateTime } from "../components/amplifyUi";

/**
 * My Connections — the LinkedIn account Amplify posts from, and the one place
 * to connect, reconnect, or disconnect it.
 *
 * Disconnect is a warning dialog because the consequence (shares stop working
 * until you reconnect) is not obvious from the button.
 */
export default function AmplifyConnectionsPage() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useNotifications();
  const [connecting, setConnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  return (
    <AmplifyShell title="My Connections" subtitle="The accounts Amplify uses on your behalf.">
      {(gate) => {
        const linkedin = gate.me?.linkedin;
        const status = linkedin?.status ?? "NOT_CONNECTED";
        const connected = status === "ACTIVE" || status === "EXPIRING";

        const handleConnect = async () => {
          setConnecting(true);
          try {
            const token = await getAccessToken();
            const auth = await startLinkedInConnect(token, { returnTo: window.location.pathname });
            const opened = window.open(auth.authorizationUrl, "_blank", "noopener,noreferrer");
            if (!opened) showError("Your browser blocked the LinkedIn window. Allow pop-ups and try again.");
          } catch (err) {
            showError(describeError(err));
          } finally {
            setConnecting(false);
          }
        };

        const handleDisconnect = async () => {
          setDisconnecting(true);
          try {
            const token = await getAccessToken();
            await disconnectLinkedIn(token);
            void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.me });
            gate.retry();
            showSuccess("LinkedIn disconnected.");
            setConfirmDisconnect(false);
          } catch (err) {
            showError(describeError(err));
          } finally {
            setDisconnecting(false);
          }
        };

        return (
          <Box>
            <AmplifySectionCard
              title="LinkedIn"
              action={
                connecting ? (
                  <CircularProgress size={18} />
                ) : connected ? (
                  <Button size="small" color="error" variant="outlined" onClick={() => setConfirmDisconnect(true)} sx={amplifyBtnSx}>
                    Disconnect
                  </Button>
                ) : (
                  <Button size="small" variant="contained" startIcon={<LinkedinIcon size={16} />} onClick={handleConnect} sx={amplifyBtnSx}>
                    {status === "NEEDS_RECONNECT" ? "Reconnect" : "Connect"}
                  </Button>
                )
              }
            >
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <LinkedinIcon size={20} />
                  <Chip size="small" color={connectionStatusColor(status)} label={connectionStatusLabel(status)} />
                </Stack>
                {linkedin?.expires_at && (
                  <Typography variant="body2" color="text.secondary">
                    Access expires {formatDateTime(linkedin.expires_at)}.
                  </Typography>
                )}
                {status === "NEEDS_RECONNECT" && (
                  <Alert severity="warning">
                    Your LinkedIn access expired or was revoked. Reconnect to keep amplifying.
                  </Alert>
                )}
                {status === "NOT_CONNECTED" && (
                  <Typography variant="body2" color="text.secondary">
                    Connect your LinkedIn account so Amplify can share the campaigns you pick.
                    You can disconnect at any time.
                  </Typography>
                )}
              </Stack>
            </AmplifySectionCard>

            <Dialog open={confirmDisconnect} onClose={disconnecting ? undefined : () => setConfirmDisconnect(false)} maxWidth="xs" fullWidth>
              <DialogTitle>Disconnect LinkedIn?</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  While disconnected you can't amplify campaigns — new shares will
                  be refused until you reconnect. Points you already have are kept.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setConfirmDisconnect(false)} disabled={disconnecting} sx={amplifyBtnSx}>
                  Cancel
                </Button>
                <Button onClick={handleDisconnect} color="error" variant="contained" disabled={disconnecting} sx={amplifyBtnSx}>
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        );
      }}
    </AmplifyShell>
  );
}
