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

import { useEffect, useState } from "react";
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
import { AMPLIFY_SETTING_KEYS, type Setting, type SchedulerSync, type SettingValue } from "../api/amplifyTypes";
import { AMPLIFY_QUERY_KEYS, useAmplifyAdminSettings } from "../api/amplifyHooks";
import AmplifySectionCard from "../components/AmplifySectionCard";
import { amplifyBtnSx } from "../components/amplifyUi";

/**
 * The four settings the milestone names. Editing happens on strings, but the
 * backend validates the JSON type per key, so each field declares how its draft
 * becomes a wire value: `leaderboard.top_n` must go out as a JSON number, the
 * schedule as the scheduler's own string (`@every 30m`, or a 5-field cron).
 */
const FIELDS: {
  key: string;
  label: string;
  helper: string;
  kind: "int" | "schedule";
  inputType: "number" | "text";
}[] = [
  {
    key: AMPLIFY_SETTING_KEYS.topN,
    label: "Leaderboard top N",
    helper: "How many people the company board shows (1–50).",
    kind: "int",
    inputType: "number",
  },
  {
    key: AMPLIFY_SETTING_KEYS.runSchedule,
    label: "Reminder run schedule",
    helper: "When the campaign reminder job runs: @every 30m, or a 5-field cron in UTC (minimum 60s).",
    kind: "schedule",
    inputType: "text",
  },
  {
    key: AMPLIFY_SETTING_KEYS.reminderDays,
    label: "Reminder days before close",
    helper: "How many days before a campaign closes to nudge people (1–30).",
    kind: "int",
    inputType: "number",
  },
  {
    key: AMPLIFY_SETTING_KEYS.campaignDefaultWindow,
    label: "Default campaign window (days)",
    helper: "Default length of a campaign when no close date is given (1–365).",
    kind: "int",
    inputType: "number",
  },
];

/** The wire value for a draft string: numbers must go out as JSON numbers. */
function toSettingValue(field: (typeof FIELDS)[number], draft: string): SettingValue {
  if (field.kind === "int") {
    const n = Number(draft);
    return Number.isFinite(n) ? n : draft;
  }
  return draft;
}

/**
 * Admin settings. Each value is versioned (ADR-024 optimistic locking), so a
 * save sends the version it read — and a save that raced someone else's gets
 * told rather than silently clobbering them.
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

  useEffect(() => {
    if (query.data) {
      // Values arrive as raw JSON (numbers included); the form edits strings.
      setDraft(Object.fromEntries(query.data.settings.map((s) => [s.key, String(s.value)])));
    }
  }, [query.data]);

  const byKey = new Map<string, Setting>((query.data?.settings ?? []).map((s) => [s.key, s]));
  const dirty = FIELDS.some((f) => {
    const current = byKey.get(f.key);
    return draft[f.key] !== undefined && current !== undefined && draft[f.key] !== String(current.value);
  });

  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();

  const save = async () => {
    const changes = FIELDS.filter((f) => {
      const current = byKey.get(f.key);
      return current && draft[f.key] !== undefined && draft[f.key] !== String(current.value);
    }).map((f) => ({
      key: f.key,
      value: toSettingValue(f, draft[f.key]),
      version: byKey.get(f.key)!.version,
    }));
    if (changes.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const result = await putAdminSettings(token, { changes });
      if (result?.schedulerSync) setSchedulerSync(result.schedulerSync);
      // Invalidate rather than setQueryData: the query key carries the caller's
      // `sub` as its last element, so a prefix write would not match it.
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.adminSettings });
      showSuccess("Settings saved.");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const token = await getAccessToken();
      const result = await syncScheduler(token);
      setSchedulerSync(result.schedulerSync);
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.adminSettings });
      showSuccess(`Scheduler sync: ${result.schedulerSync.toLowerCase()}.`);
    } catch (err) {
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
              {FIELDS.map((f) => (
                <TextField
                  key={f.key}
                  fullWidth
                  size="small"
                  label={f.label}
                  helperText={f.helper}
                  value={draft[f.key] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  type={f.inputType}
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
