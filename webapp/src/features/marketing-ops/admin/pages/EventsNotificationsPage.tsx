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
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { Send } from "@wso2/oxygen-ui-icons-react";
import { describeError } from "@api/errors";
import { MARKETING_OPS_EYEBROW } from "@constants/marketingOpsApps";
import MarketingOpsShell from "../../components/MarketingOpsShell";
import {
  useNotificationSettings,
  useSaveNotificationSettings,
  useSendTestNotification,
} from "../../api/useEvents";

// Marketing Admin → Events submission emails.
//
// When a regional marketing manager submits a list, everyone here gets one email saying
// it's waiting in the review queue. Submission is the only event that emails — approve,
// send back and import don't.
//
// Two settings, saved together: the switch and the recipients. The switch is OFF until
// an admin turns it on, and it can't be turned on with nobody to send to (the server
// refuses that, since "on" with an empty list would look like it works).
//
// A singleton config, so a plain form like the Pardot defaults rather than a list
// manager. Recipients are CHIPS: type an address and press Enter. A comma, semicolon or
// space ends one too, which is what makes pasting a whole To line work — it lands as one
// chip per address. Leaving the box with an address half-typed keeps it rather than
// dropping it.

// The same loose check the server applies (notifications.py). The server stays the
// judge; this only stops an obvious non-address becoming a chip.
const EMAIL = /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$/;

/** Fold typed or pasted text into the list. Returns the new list and whatever wasn't an
 *  address, which stays in the box for the admin to fix. Duplicates (ignoring case) are
 *  dropped silently — adding someone twice isn't a mistake worth a message. */
function absorb(text: string, list: string[]): { list: string[]; rejected: string[] } {
  const next = [...list];
  const rejected: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const email = raw.trim();
    if (!email) continue;
    if (!EMAIL.test(email)) rejected.push(email);
    else if (!next.some((e) => e.toLowerCase() === email.toLowerCase())) next.push(email);
  }
  return { list: next, rejected };
}

const LABEL = {
  fontSize: 11,
  fontWeight: 700,
  color: "text.secondary",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  mb: 0.5,
};
const inputSx = { fontSize: 13, bgcolor: "background.default" } as const;

export default function EventsNotificationsPage() {
  const query = useNotificationSettings();
  const save = useSaveNotificationSettings();
  const test = useSendTestNotification();

  // Server data is the baseline; these hold only what the admin changed. Same
  // derive-don't-sync shape as the other admin panels — a background refetch can't
  // discard in-progress edits, and after a save the baseline advances by itself.
  const [enabledEdit, setEnabledEdit] = useState<boolean | null>(null);
  const [listEdit, setListEdit] = useState<string[] | null>(null);
  // What's in the box, not yet a chip.
  const [draft, setDraft] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const saved = query.data;
  const enabled = enabledEdit ?? saved?.enabled ?? false;
  const recipients = listEdit ?? saved?.recipients ?? [];
  const dirty =
    Boolean(saved) &&
    (enabled !== saved!.enabled ||
      recipients.join("\n") !== saved!.recipients.join("\n") ||
      draft.trim() !== "");

  /** Turn the box's text into chips. Returns the resulting list, or null if something
   *  in it isn't an address (which then stays in the box, flagged). */
  function commitDraft(text: string = draft): string[] | null {
    if (!text.trim()) {
      setDraft("");
      setInputError(null);
      return recipients;
    }
    const { list, rejected } = absorb(text, recipients);
    setListEdit(list);
    setDraft(rejected.join(" "));
    setInputError(
      rejected.length
        ? `“${rejected[0]}” isn’t an email address.${rejected.length > 1 ? ` (and ${rejected.length - 1} more)` : ""}`
        : null,
    );
    return rejected.length ? null : list;
  }

  function discard() {
    setEnabledEdit(null);
    setListEdit(null);
    setDraft("");
    setInputError(null);
    setError(null);
    setNotice(null);
  }

  async function submit() {
    setError(null);
    setNotice(null);
    // An address typed but not yet a chip is still meant — take it with the save.
    const list = commitDraft();
    if (!list) return;
    try {
      await save.mutateAsync({ enabled, recipients: list });
      setEnabledEdit(null);
      setListEdit(null);
      setNotice("Settings saved.");
    } catch (e) {
      setError(describeError(e));
    }
  }

  async function sendTest() {
    setError(null);
    setNotice(null);
    try {
      const r = await test.mutateAsync();
      const n = r?.recipients ?? saved?.recipients.length ?? 0;
      setNotice(
        `Test email sent to ${n} ${n === 1 ? "recipient" : "recipients"}. ` +
          "If it hasn't arrived in a few minutes, check spam, then the backend logs.",
      );
    } catch (e) {
      setError(describeError(e));
    }
  }

  const canTest =
    Boolean(saved?.recipients.length) && !dirty && Boolean(saved?.delivery_configured);

  return (
    <MarketingOpsShell
      eyebrow={MARKETING_OPS_EYEBROW.admin}
      title="Events — submission emails"
      subtitle="Who hears about it when a regional marketing manager submits an attendee list for review."
    >
      {query.isError ? (
        <Alert severity="error">
          Could not load the notification settings. {describeError(query.error)}
        </Alert>
      ) : !saved ? (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", py: 3 }}>
          <CircularProgress size={16} />
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Loading settings…</Typography>
        </Stack>
      ) : (
        <Box sx={{ maxWidth: 720 }}>
          {/* Said up front, not discovered after a week of silence: switched on is not
              the same as sending when the server has no email credentials. */}
          {!saved.delivery_configured && (
            <Alert severity="warning" sx={{ mb: 3, fontSize: 13 }}>
              This server isn't connected to the email service yet, so nothing will be sent
              whatever is set here. Whoever deploys Marketing Ops needs to set the{" "}
              <code>EMAIL_SERVICE_*</code> settings.
            </Alert>
          )}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              px: 1.5,
              py: 1,
              mb: 3,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                Email the reviewers when a list is submitted
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                One email per submission to everyone below: the event, its campaign ID and the
                row counts. No attendee details.
              </Typography>
            </Box>
            <Switch
              checked={enabled}
              inputProps={{ "aria-label": "Email the reviewers when a list is submitted" }}
              onChange={(e) => setEnabledEdit(e.target.checked)}
            />
          </Box>

          <Typography sx={LABEL}>Recipients</Typography>
          {/* Free text, multiple: each value is a chip with its own ✕. There are no
              options to pick from, so the dropdown never opens. Enter is taken over so
              an invalid address stays in the box with a message instead of becoming a
              chip. */}
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            open={false}
            value={recipients}
            inputValue={draft}
            onChange={(_event, next, reason) => {
              // Only removals arrive here (a chip's ✕, Backspace, clear-all); Enter is
              // handled in onKeyDown.
              if (reason === "removeOption" || reason === "clear") {
                setListEdit(next as string[]);
                setNotice(null);
              }
            }}
            onInputChange={(_event, value, reason) => {
              if (reason === "reset") return;
              setInputError(null);
              setNotice(null);
              // A separator typed or pasted ends an address: "a@x.com, b@x.com" → two chips.
              if (/[\s,;]/.test(value)) commitDraft(value);
              else setDraft(value);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder={recipients.length ? "Add another…" : "name@wso2.com, then Enter"}
                error={Boolean(inputError)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // Stop Autocomplete making a chip of whatever is typed, valid or not.
                    (e as unknown as { defaultMuiPrevented: boolean }).defaultMuiPrevented = true;
                    e.preventDefault();
                    commitDraft();
                  }
                }}
                onBlur={() => commitDraft()}
                sx={{ "& .MuiInputBase-root": inputSx }}
              />
            )}
          />
          <Typography
            sx={{ fontSize: 11.5, color: inputError ? "error.main" : "text.secondary", mt: 0.5 }}
          >
            {inputError ??
              (recipients.length
                ? `${recipients.length} ${recipients.length === 1 ? "recipient" : "recipients"}. Press Enter after each address, or paste a list.`
                : "Press Enter after each address, or paste a list separated by commas.")}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2, fontSize: 13 }}>
              {error}
            </Alert>
          )}
          {notice && !dirty && (
            <Alert severity="success" sx={{ mt: 2, fontSize: 13 }}>
              {notice}
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 3 }}>
            {/* Sends to the SAVED list, so it's only offered when nothing is unsaved —
                otherwise "test" would quietly test a different list from the one on
                screen. */}
            <Button
              onClick={sendTest}
              disabled={!canTest || test.isPending}
              startIcon={
                test.isPending ? <CircularProgress size={14} color="inherit" /> : <Send size={15} />
              }
              sx={{ textTransform: "none", color: "text.secondary" }}
            >
              {test.isPending ? "Sending…" : "Send a test email"}
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button
              onClick={discard}
              disabled={!dirty || save.isPending}
              sx={{ textTransform: "none", color: "text.secondary" }}
            >
              Discard
            </Button>
            <Button
              onClick={submit}
              disabled={!dirty || save.isPending}
              variant="contained"
              startIcon={save.isPending ? <CircularProgress size={15} color="inherit" /> : undefined}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </Box>

          {saved.updated_by && saved.updated_at && (
            <Typography sx={{ fontSize: 11.5, color: "text.disabled", mt: 2 }}>
              Last changed by {saved.updated_by},{" "}
              {new Date(saved.updated_at).toLocaleString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              .
            </Typography>
          )}
        </Box>
      )}
    </MarketingOpsShell>
  );
}
