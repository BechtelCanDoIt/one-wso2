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

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@wso2/oxygen-ui";
import { dialogPaperSx } from "@components/confirmation-dialog/dialogPaperSx";
import { useNotifications } from "@context/notifications/NotificationsContext";
import type { Campaign } from "../api/amplifyTypes";
import { useRequestShare } from "../api/useAmplifyMutations";
import { describeAmplifyError } from "../util/amplifyError";

/**
 * "Amplify, share this for me." A plain share in phase 1: the LinkedIn API
 * Amplify uses can't add the employee's own commentary yet. The share is
 * queued; the next Amplify run posts it on the employee's LinkedIn.
 */
export default function ShareDialog({ campaign, onClose }: { campaign: Campaign | null; onClose: () => void }) {
  const share = useRequestShare();
  const { showError, showSuccess } = useNotifications();

  const submit = () => {
    if (!campaign) return;
    share.mutate(
      { campaignId: campaign.id, kind: "SHARE" },
      {
        onSuccess: () => {
          showSuccess("Queued. It goes out on your LinkedIn with the next Amplify run.");
          onClose();
        },
        onError: (err) => showError(describeAmplifyError(err)),
      },
    );
  };

  return (
    <Dialog
      open={campaign !== null}
      onClose={share.isPending ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <DialogTitle sx={{ fontSize: 17, fontWeight: 700 }}>Amplify this post</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {campaign?.title}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        <Button onClick={onClose} disabled={share.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={share.isPending}>
          {share.isPending ? "Sharing…" : "Amplify"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
