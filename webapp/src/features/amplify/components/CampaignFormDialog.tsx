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
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
} from "@wso2/oxygen-ui";
import { useQueryClient } from "@tanstack/react-query";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { createCampaign, patchCampaign } from "../api/amplifyClient";
import { useIdempotencyKey } from "../api/idempotency";
import type { Campaign, CampaignDraft, CampaignPatch } from "../api/amplifyTypes";
import { AMPLIFY_QUERY_KEYS, useAmplifyCategories } from "../api/amplifyHooks";
import { amplifyBtnSx } from "./amplifyUi";
import {
  campaignFormError,
  defaultClosesAt,
  DEFAULT_CAMPAIGN_WINDOW_DAYS,
  fromLocalInput,
  parseTags,
  toLocalInput,
  type CampaignFormValues,
} from "./amplifyForms";

interface FormState extends CampaignFormValues {
  isPriority: boolean;
}

/** A fresh create form: opens now, closes 30 days later (C7). */
function blankForm(now: Date = new Date()): FormState {
  const opensAt = toLocalInput(now.toISOString());
  return {
    resourceUrn: "",
    ownerUrn: "",
    resourceUrl: "",
    title: "",
    summary: "",
    imageUrl: "",
    categoryCode: "",
    isPriority: false,
    tags: "",
    opensAt,
    closesAt: defaultClosesAt(opensAt),
  };
}

// The form edits `datetime-local` strings throughout; ISO only on the wire.
function fromCampaign(c: Campaign): FormState {
  return {
    resourceUrn: c.resourceUrn,
    ownerUrn: c.ownerUrn,
    resourceUrl: c.resourceUrl ?? "",
    title: c.title,
    summary: c.summary ?? "",
    imageUrl: c.imageUrl ?? "",
    categoryCode: c.categoryCode,
    isPriority: c.isPriority,
    tags: c.tags.join(", "),
    opensAt: toLocalInput(c.opensAt),
    closesAt: toLocalInput(c.closesAt),
  };
}

/**
 * Create or edit a campaign. On create the window opens now and closes 30 days
 * later (C7); moving the open date carries the close with it until the close is
 * set by hand. "Save & share now" asks the backend to start the announcement
 * run immediately rather than at the next scheduled tick.
 *
 * Idempotency: one key per (dialog-open, draft) — a retried create after a
 * timeout replays instead of registering twice; an edited draft gets a new key.
 */
export default function CampaignFormDialog({
  open,
  campaign,
  onClose,
}: {
  open: boolean;
  /** Present for edit; absent for create. */
  campaign?: Campaign;
  onClose: () => void;
}) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showSuccess } = useNotifications();
  const categories = useAmplifyCategories();
  const idempotency = useIdempotencyKey();

  const isEdit = Boolean(campaign);
  const [form, setForm] = useState<FormState>(() => blankForm());
  const [closesTouched, setClosesTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(campaign ? fromCampaign(campaign) : blankForm());
    setClosesTouched(Boolean(campaign));
    setError(null);
    idempotency.reset();
  }, [open, campaign, idempotency]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setOpensAt = (opensAt: string) =>
    setForm((f) => ({ ...f, opensAt, closesAt: closesTouched ? f.closesAt : defaultClosesAt(opensAt) }));

  const handleSubmit = async (shareNow: boolean) => {
    setError(null);
    const problem = campaignFormError(form, isEdit);
    if (problem) {
      setError(problem);
      return;
    }
    const tags = parseTags(form.tags);

    setBusy(true);
    try {
      const token = await getAccessToken();
      if (isEdit && campaign) {
        // Blank strings are sent, not dropped: the backend trims "" to null,
        // which is how a summary or image is cleared.
        const patch: CampaignPatch = {
          version: campaign.version,
          title: form.title.trim(),
          summary: form.summary.trim(),
          imageUrl: form.imageUrl.trim(),
          categoryCode: form.categoryCode,
          isPriority: form.isPriority,
          tags,
          opensAt: fromLocalInput(form.opensAt),
          closesAt: fromLocalInput(form.closesAt),
        };
        await patchCampaign(token, campaign.id, patch, idempotency.keyFor({ id: campaign.id, patch }));
        idempotency.settle();
        showSuccess(`Updated “${form.title.trim()}”.`);
      } else {
        const draft: CampaignDraft = {
          resourceUrn: form.resourceUrn.trim(),
          ownerUrn: form.ownerUrn.trim(),
          resourceUrl: form.resourceUrl.trim() || undefined,
          title: form.title.trim(),
          summary: form.summary.trim() || undefined,
          imageUrl: form.imageUrl.trim() || undefined,
          categoryCode: form.categoryCode,
          isPriority: form.isPriority,
          tags,
          opensAt: fromLocalInput(form.opensAt),
          closesAt: fromLocalInput(form.closesAt),
        };
        await createCampaign(token, draft, {
          shareNow,
          idempotencyKey: idempotency.keyFor({ shareNow, draft }),
        });
        idempotency.settle();
        showSuccess(
          shareNow ? `Created “${draft.title}” and queued the announcement.` : `Created “${draft.title}”.`,
        );
      }
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.campaigns });
      onClose();
    } catch (err) {
      idempotency.settle(err);
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Edit campaign" : "New campaign"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            fullWidth
            size="small"
            label="Title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            label="Summary"
            value={form.summary}
            onChange={(e) => set("summary", e.target.value)}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Category"
              value={form.categoryCode}
              onChange={(e) => set("categoryCode", e.target.value)}
            >
              {(categories.data?.categories ?? []).map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              size="small"
              label="Image URL"
              value={form.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              fullWidth
              size="small"
              type="datetime-local"
              label="Opens"
              value={form.opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth
              size="small"
              type="datetime-local"
              label="Closes"
              value={form.closesAt}
              onChange={(e) => {
                setClosesTouched(true);
                set("closesAt", e.target.value);
              }}
              helperText={isEdit ? undefined : `Defaults to ${DEFAULT_CAMPAIGN_WINDOW_DAYS} days after it opens.`}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
          <TextField
            fullWidth
            size="small"
            label="Tags"
            placeholder="comma, separated, tags"
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
          />
          {!isEdit && (
            <>
              <TextField
                fullWidth
                size="small"
                label="Resource URN"
                value={form.resourceUrn}
                onChange={(e) => set("resourceUrn", e.target.value)}
                helperText="The URN of the content being amplified."
              />
              <TextField
                fullWidth
                size="small"
                label="Owner URN"
                value={form.ownerUrn}
                onChange={(e) => set("ownerUrn", e.target.value)}
                helperText="Who owns the underlying resource."
              />
              <TextField
                fullWidth
                size="small"
                label="Resource URL"
                value={form.resourceUrl}
                onChange={(e) => set("resourceUrl", e.target.value)}
              />
            </>
          )}
          <FormControlLabel
            control={<Checkbox checked={form.isPriority} onChange={(e) => set("isPriority", e.target.checked)} />}
            label="Priority campaign"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} sx={amplifyBtnSx}>
          Cancel
        </Button>
        {!isEdit && (
          <Button onClick={() => handleSubmit(true)} variant="outlined" disabled={busy} sx={amplifyBtnSx}>
            Save &amp; share now
          </Button>
        )}
        <Button onClick={() => handleSubmit(false)} variant="contained" disabled={busy} sx={amplifyBtnSx}>
          {busy ? "Saving…" : isEdit ? "Save changes" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
