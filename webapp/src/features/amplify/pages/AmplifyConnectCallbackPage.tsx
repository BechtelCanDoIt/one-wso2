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

import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { completeLinkedInConnect } from "../api/amplifyClient";
import { AMPLIFY_QUERY_KEYS } from "../api/amplifyHooks";
import { amplifyBtnSx } from "../components/amplifyUi";
import {
  describeOAuthError,
  loadPendingShare,
  safeReturnPath,
  saveConnectResult,
} from "../components/shareFlow";

/**
 * Where LinkedIn sends the reader back after consent.
 *
 * This page runs in the NEW tab the connect flow opened. It finishes the
 * handshake, writes the result to localStorage so the tab that started the
 * share learns about it (that is the only store two tabs share), and then
 * closes itself. If the browser refuses to close a tab it did not open, the
 * button below puts the reader back where they were, and the storage event has
 * already done the rest.
 */
export default function AmplifyConnectCallbackPage() {
  const [params] = useSearchParams();
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState<string | null>(null);
  const ran = useRef(false);

  // Validated: it comes from storage (and, after completion, the backend's
  // echo), and is used as a navigation target and an href.
  const [returnTo, setReturnTo] = useState(() => safeReturnPath(loadPendingShare()?.returnTo));

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get("code");
    const stateParam = params.get("state");
    const errorParam = params.get("error");

    if (errorParam || !code || !stateParam) {
      // LinkedIn's `error` (and `error_description`) are attacker-controllable
      // text in our address bar — mapped to fixed copy, never rendered.
      const reason = describeOAuthError(errorParam);
      saveConnectResult({ status: "error", message: reason });
      setMessage(reason);
      setState("error");
      return;
    }

    void (async () => {
      try {
        const token = await getAccessToken();
        const connection = await completeLinkedInConnect(token, { code, state: stateParam });
        if (!loadPendingShare() && connection.returnTo) setReturnTo(safeReturnPath(connection.returnTo));
        void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.me });
        saveConnectResult({ status: "ok" });
        setState("done");
        // Give the original tab a beat to pick up the storage event, then try
        // to close. If we opened as a script-opened tab this succeeds.
        window.setTimeout(() => window.close(), 1200);
      } catch (err) {
        const text = describeError(err);
        saveConnectResult({ status: "error", message: text });
        setMessage(text);
        setState("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ maxWidth: 520 }}>
      {state === "working" && (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Finishing the LinkedIn connection…
          </Typography>
        </Stack>
      )}
      {state === "done" && (
        <Alert severity="success">
          LinkedIn connected. You can close this tab — the page you came from has
          picked up the connection.
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              href={returnTo}
              onClick={(e) => {
                e.preventDefault();
                navigate(returnTo);
              }}
              sx={amplifyBtnSx}
            >
              Back to Amplify
            </Button>
          </Box>
        </Alert>
      )}
      {state === "error" && (
        <Alert severity="error">
          Couldn't connect LinkedIn. {message}
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              href={returnTo}
              onClick={(e) => {
                e.preventDefault();
                navigate(returnTo);
              }}
              sx={amplifyBtnSx}
            >
              Back to Amplify
            </Button>
          </Box>
        </Alert>
      )}
    </Box>
  );
}
