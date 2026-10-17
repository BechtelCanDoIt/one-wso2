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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { useQueryClient } from "@tanstack/react-query";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { retryAnnouncement } from "../api/amplifyClient";
import { useIdempotencyKey } from "../api/idempotency";
import type { Announcement, AnnouncementStatus } from "../api/amplifyTypes";
import { AMPLIFY_QUERY_KEYS, useAmplifyAdminAnnouncements } from "../api/amplifyHooks";
import AmplifySectionCard from "../components/AmplifySectionCard";
import { amplifyBtnSx, formatDateTime } from "../components/amplifyUi";

function announcementColor(status: AnnouncementStatus) {
  switch (status) {
    case "SENT":
      return "success" as const;
    case "QUEUED":
      return "info" as const;
    case "FAILED":
      return "error" as const;
  }
}

/**
 * The announcement queue, filtered to what an admin needs to act on. Failed
 * rows carry their last error and a Retry — the whole reason this tab exists.
 */
export default function AmplifyAdminAnnouncementsTab() {
  const [status, setStatus] = useState<AnnouncementStatus | "ALL">("FAILED");
  const query = useAmplifyAdminAnnouncements(status === "ALL" ? undefined : status);

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: "center" }}>
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as AnnouncementStatus | "ALL")}
          sx={{ minWidth: 180 }}
        >
          {(["FAILED", "QUEUED", "SENT", "ALL"] as const).map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <AmplifySectionCard title="Announcements">
        {query.isError ? (
          <Alert severity="error">{describeError(query.error)}</Alert>
        ) : query.isPending ? (
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading announcements…
            </Typography>
          </Stack>
        ) : (query.data?.items.length ?? 0) === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nothing here.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Campaign</TableCell>
                <TableCell>Space</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Queued</TableCell>
                <TableCell>Last error</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(query.data?.items ?? []).map((a) => (
                <AnnouncementRow key={`${a.campaignId}-${a.queuedAt}`} announcement={a} />
              ))}
            </TableBody>
          </Table>
        )}
      </AmplifySectionCard>
    </Box>
  );
}

function AnnouncementRow({ announcement }: { announcement: Announcement }) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();
  const [busy, setBusy] = useState(false);
  const idempotency = useIdempotencyKey();

  const handleRetry = async () => {
    setBusy(true);
    const key = idempotency.keyFor({ campaignId: announcement.campaignId, queuedAt: announcement.queuedAt });
    try {
      const token = await getAccessToken();
      await retryAnnouncement(token, announcement.campaignId, key);
      idempotency.settle();
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.adminAnnouncements });
      showSuccess("Announcement re-queued.");
    } catch (err) {
      idempotency.settle(err);
      showError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TableRow hover>
      <TableCell>{announcement.campaignId}</TableCell>
      <TableCell>{announcement.space}</TableCell>
      <TableCell>
        <Chip size="small" color={announcementColor(announcement.status)} label={announcement.status} />
      </TableCell>
      <TableCell>{formatDateTime(announcement.queuedAt)}</TableCell>
      <TableCell sx={{ maxWidth: 240 }}>
        <Typography variant="caption" color="text.secondary">
          {announcement.lastError ?? "—"}
        </Typography>
      </TableCell>
      <TableCell align="right">
        {announcement.status === "FAILED" && (
          <Button size="small" variant="outlined" disabled={busy} onClick={handleRetry} sx={amplifyBtnSx}>
            {busy ? "Retrying…" : "Retry"}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
