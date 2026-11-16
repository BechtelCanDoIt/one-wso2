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

import { useState, type JSX, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@wso2/oxygen-ui";
import { describeError } from "@api/errors";
import { EA_SCOPE_SX } from "./eaStyles";
import { eaError } from "../api/engagementHttp";
import { dialogPaperSx } from "@components/confirmation-dialog/dialogPaperSx";

/** A dialog for one form or one decision: title (and a line under it), body, Cancel on the left of the actions and the confirming action on the right. */
export default function EaDialog({
  title,
  subtitle,
  children,
  confirmLabel = "Confirm",
  confirmColor = "primary",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
  busy = false,
  error,
  extraActions,
  maxWidth = "sm",
  confirmDisabled = false,
}: {
  readonly title: string;
  readonly subtitle?: ReactNode;
  readonly children?: ReactNode;
  readonly confirmLabel?: string;
  readonly confirmColor?: "primary" | "error";
  readonly cancelLabel?: string;
  /** Omit for a read-only dialog: Close is then the only action. */
  readonly onConfirm?: () => void;
  readonly onClose: () => void;
  readonly busy?: boolean;
  /** A validation message (string) or a failed request (shown via describeError). */
  readonly error?: unknown;
  /** More actions beside the confirming one, e.g. "Confirm and Approve". */
  readonly extraActions?: ReactNode;
  readonly maxWidth?: "xs" | "sm" | "md";
  readonly confirmDisabled?: boolean;
}): JSX.Element {
  const message = error === undefined || error === null || error === "" ? "" : typeof error === "string" ? error : describeError(eaError(error));
  return (
    <Dialog open fullWidth maxWidth={maxWidth} onClose={busy ? undefined : onClose} sx={EA_SCOPE_SX} slotProps={{ paper: { sx: dialogPaperSx } }}>
      <DialogTitle sx={{ pb: subtitle ? 0.5 : undefined }}>
        {title}
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent>
        {typeof children === "string" ? <DialogContentText>{children}</DialogContentText> : children}
        {message ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {message}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        {onConfirm ? (
          <>
            <Button size="small" onClick={onClose} disabled={busy}>
              {cancelLabel}
            </Button>
            <Box sx={{ flex: 1 }} />
            {extraActions}
            <Button
              size="small"
              variant="contained"
              color={confirmColor}
              onClick={onConfirm}
              disabled={busy || confirmDisabled}
            >
              {busy ? "Saving…" : confirmLabel}
            </Button>
          </>
        ) : (
          <Button size="small" variant="contained" onClick={onClose}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

/** Yes / No before anything irreversible or externally visible, as the legacy apps asked. */
export function ConfirmDialog({
  title,
  text,
  confirmLabel = "Yes",
  cancelLabel = "No",
  danger = false,
  run,
  onClose,
  onDone,
}: {
  readonly title: string;
  readonly text: ReactNode;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly danger?: boolean;
  readonly run: () => Promise<unknown>;
  readonly onClose: () => void;
  readonly onDone?: () => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <EaDialog
      title={title}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      confirmColor={danger ? "error" : "primary"}
      busy={busy}
      error={error}
      onClose={onClose}
      onConfirm={() => {
        setBusy(true);
        setError(undefined);
        run().then(
          () => {
            setBusy(false);
            onDone?.();
            onClose();
          },
          (e: unknown) => {
            setBusy(false);
            setError(e);
          },
        );
      }}
    >
      {typeof text === "string" ? <DialogContentText>{text}</DialogContentText> : text}
    </EaDialog>
  );
}
