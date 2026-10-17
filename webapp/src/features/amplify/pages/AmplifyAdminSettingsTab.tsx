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
// KIND, either express or implied. See the License for the specific
// language governing permissions and limitations under the License.

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { RefreshCwIcon } from "@wso2/oxygen-ui-icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { putAdminSettings, syncScheduler } from "../api/amplifyClient";
import { useIdempotencyKey } from "../api/idempotency";
import type { Setting, SchedulerSync, SettingChange } from "../api/amplifyTypes";
import { AMPLIFY_QUERY_KEYS, useAmplifyAdminSettings } from "../api/amplifyHooks";
import AmplifySectionCard from "../components/AmplifySectionCard";
import { amplifyBtnSx } from "../components/amplifyUi";
import {
  mergeSettingDrafts,
  SETTING_FIELDS,
  settingDraft,
  toSettingValue,
} from "../components/amplifyForms";

/**
 * Admin settings. Each value is versioned (ADR-024 optimistic locking), so a
 * save sends the version it read — and a save that raced someone else's gets
 * told rather than silently clobbering them.
 *
 * Values are raw JSON on the wire: ints go out as JSON numbers (an int sent as
 * a string is `INVALID_SETTING`), and a draft that isn't a valid value for its
 * key is refused here, before a request is spent on it.
 *
 * The `schedulerSync` states surface here because the interval setting is only
 * half-applied until the job scheduler has been told the new value: PENDING
 * means "saved, not yet pushed", and Sync now forces that push.
 */
export default function AmplifyAdminSettingsTab() {
  const query = useAmplifyAdminSettings();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  // `schedulerSync` only ever arrives on a PUT that changed a schedule setting
  // (ADR-026) and on the manual sync — the GET never carries it — so the banner
  // is fed from the write's own answer, not from the read.
  const [schedulerSync, setSchedulerSync] = useState<SchedulerSync | undefined>();
  const saveKey = useIdempotencyKey();
  const syncKey = useIdempotencyKey();

  // The server values the drafts were last seeded from, so a refetch only
  // moves the keys the reader hasn't touched.
  const seededFrom = useRef<readonly Setting[] | undefined>(undefined);
  useEffect(() => {
    if (!query.data) return;
    const next = query.data.settings;
    setDraft((d) => mergeSettingDrafts(d, seededFrom.current, next));
    seededFrom.current = next;
  }, [query.data]);

  const byKey = new Map<string, Setting>((query.data?.settings ?? []).map((s) => [s.key, s]));
  const changedFields = SETTING_FIELDS.filter((f) => {
    const current = byKey.get(f.key);
    return current !== undefined && draft[f.key] !== undefined && draft[f.key] !== settingDraft(current.value);
  });
  const dirty = changedFields.length > 0;

  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();

  const save = async () => {
    const changes: SettingChange[] = [];
    for (const f of changedFields) {
      const parsed = toSettingValue(f, draft[f.key]);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      changes.push({ key: f.key, value: parsed.value, version: byKey.get(f.key)!.version });
    }
    if (changes.length === 0) return;
    setSaving(true);
    setError(null);
    const body = { changes };
    const key = saveKey.keyFor(body);
    try {
      const token = await getAccessToken();
      const result = await putAdminSettings(token, body, key);
      saveKey.settle();
      if (result?.schedulerSync) setSchedulerSync(result.schedulerSync);
      if (result?.settings) {
        // Seed straight from the write's answer (it is the post-change state),
        // so the saved fields read clean even if the server normalised them.
        setDraft((d) => {
          const next = { ...d };
          for (const s of result.settings) next[s.key] = settingDraft(s.value);
          return next;
        });
        seededFrom.current = result.settings;
      }
      // Invalidate rather than setQueryData: the query key carries the caller's
      // `sub` as its last element, so a prefix write would not match it.
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.adminSettings });
      showSuccess("Settings saved.");
    } catch (err) {
      saveKey.settle(err);
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    const key = syncKey.keyFor({ sync: true });
    try {
      const token = await getAccessToken();
      const result = await syncScheduler(token, key);
      syncKey.settle();
      setSchedulerSync(result.schedulerSync);
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.adminSettings });
      showSuccess(`Scheduler sync: ${result.schedulerSync.toLowerCase()}.`);
    } catch (err) {
      syncKey.settle(err);
      showError(describeError(err));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box>
      {query.isError ? (
        <Alert severity="error">{describeError(query.error)}</Alert>
      ) : query.isPending ? (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Loading settings…
          </Typography>
        </Stack>
      ) : (
        <>
          {schedulerSync === "PENDING" && (
            <Alert
              severity="warning"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={syncNow} disabled={syncing} sx={amplifyBtnSx}>
                  {syncing ? "Syncing…" : "Sync now"}
                </Button>
              }
            >
              A setting change hasn't reached the job scheduler yet. Until it does, the old interval keeps running.
            </Alert>
          )}
          {schedulerSync === "NOT_CONFIGURED" && (
            <Alert severity="info" sx={{ mb: 2 }}>
              The job scheduler isn't configured for this deployment — interval changes apply on the next scheduled run.
            </Alert>
          )}

          <AmplifySectionCard
            title="Amplify settings"
            caption="Saved against the deployment, applied to everyone."
            action={
              <Button variant="contained" size="small" onClick={save} disabled={saving || !dirty} sx={amplifyBtnSx}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            }
          >
            <Stack spacing={2} sx={{ maxWidth: 460 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {SETTING_FIELDS.map((f) => (
                <TextField
                  key={f.key}
                  fullWidth
                  size="small"
                  label={f.label}
                  helperText={f.helper}
                  value={draft[f.key] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  type={f.kind === "int" ? "number" : "text"}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              ))}
            </Stack>
          </AmplifySectionCard>

          {schedulerSync && (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
              <RefreshCwIcon size={14} />
              <Typography variant="caption">Scheduler: {schedulerSync}</Typography>
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
