// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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


// The pure form logic behind the Amplify dialogs: turning what a reader typed
// into the contract's wire values, and refusing what the backend would refuse
// before a request is spent on it. Kept out of the components so it can be
// tested without rendering a dialog.

import { AMPLIFY_SETTING_KEYS, type PointAction, type Setting, type SettingValue } from "../api/amplifyTypes";

/**
 * The wire body for a new rule, or the reason it cannot be sent. Points are an
 * integer 0–10000 (`PointRuleDraft`); `effectiveFrom` is optional (the server
 * defaults it to now) and is refused when in the past (`RULE_BACKDATED`), so a
 * blank date means "from now" rather than "from midnight this morning".
 */
export function pointRuleBody(
  action: PointAction,
  points: string,
  effectiveFromLocal: string,
  now: Date = new Date(),
): { ok: true; body: { action: PointAction; points: number; effectiveFrom?: string } } | { ok: false; error: string } {
  const value = Number(points);
  if (points.trim() === "" || !Number.isInteger(value) || value < 0 || value > 10000) {
    return { ok: false, error: "Points must be a whole number from 0 to 10000." };
  }
  if (!effectiveFromLocal) return { ok: true, body: { action, points: value } };
  const from = new Date(effectiveFromLocal);
  if (Number.isNaN(from.getTime())) return { ok: false, error: "That start time isn't a valid date." };
  if (from.getTime() < now.getTime()) {
    return { ok: false, error: "A rule can't start in the past. Leave it blank to start now." };
  }
  return { ok: true, body: { action, points: value, effectiveFrom: from.toISOString() } };
}


// ---- Admin settings -------------------------------------------------------

/** How a setting's draft string becomes its JSON wire value. */
export type SettingKind = "int" | "boolean" | "schedule";

export interface SettingField {
  key: string;
  label: string;
  helper: string;
  kind: SettingKind;
  /** Inclusive bounds for `int`, from `amplify-api/settings.bal`. */
  min?: number;
  max?: number;
}

/**
 * The settings the Admin screen edits — the contract's own key strings
 * (anything else comes back `UNKNOWN_SETTING`) with the backend's own bounds.
 */
export const SETTING_FIELDS: readonly SettingField[] = [
  {
    key: AMPLIFY_SETTING_KEYS.topN,
    label: "Leaderboard top N",
    helper: "How many people the company board shows (1–50).",
    kind: "int",
    min: 1,
    max: 50,
  },
  {
    key: AMPLIFY_SETTING_KEYS.runSchedule,
    label: "Run schedule",
    helper: "When the Amplify run fires: @every 30m, or a 5-field cron in UTC (minimum 60s).",
    kind: "schedule",
  },
  {
    key: AMPLIFY_SETTING_KEYS.reminderDays,
    label: "Reconnect reminder (days before expiry)",
    helper: "How many days before a LinkedIn connection expires to start nudging (1–30).",
    kind: "int",
    min: 1,
    max: 30,
  },
  {
    key: AMPLIFY_SETTING_KEYS.campaignDefaultWindow,
    label: "Default campaign window (days)",
    helper: "Default length of a campaign when no close date is given (1–365).",
    kind: "int",
    min: 1,
    max: 365,
  },
];

/**
 * The JSON wire value for a draft, or why it cannot be sent. `PUT
 * /admin/settings` validates the JSON TYPE per key: an int sent as the string
 * "5" is `INVALID_SETTING`, so ints go out as JSON numbers and booleans as JSON
 * booleans. A blank or non-integer int is refused here rather than sent.
 */
export function toSettingValue(
  field: SettingField,
  draft: string,
): { ok: true; value: SettingValue } | { ok: false; error: string } {
  const text = draft.trim();
  switch (field.kind) {
    case "int": {
      const n = Number(text);
      if (text === "" || !Number.isInteger(n)) return { ok: false, error: `${field.label} must be a whole number.` };
      if ((field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) {
        return { ok: false, error: `${field.label} must be between ${field.min} and ${field.max}.` };
      }
      return { ok: true, value: n };
    }
    case "boolean":
      if (text === "true") return { ok: true, value: true };
      if (text === "false") return { ok: true, value: false };
      return { ok: false, error: `${field.label} must be true or false.` };
    case "schedule":
      if (text === "") return { ok: false, error: `${field.label} can't be blank.` };
      return { ok: true, value: text };
  }
}

/** The editable string for a stored JSON value. */
export function settingDraft(value: SettingValue): string {
  return String(value);
}

/**
 * The form's drafts after a (re)read of the settings. A key the reader has NOT
 * edited follows the server; a key they HAVE edited keeps their text — a
 * background refetch (window focus, the post-save invalidation) must not wipe
 * an edit in progress.
 */
export function mergeSettingDrafts(
  drafts: Record<string, string>,
  previous: readonly Setting[] | undefined,
  next: readonly Setting[],
): Record<string, string> {
  const before = new Map((previous ?? []).map((s) => [s.key, settingDraft(s.value)]));
  const merged: Record<string, string> = {};
  for (const s of next) {
    const draft = drafts[s.key];
    const edited = draft !== undefined && before.has(s.key) && draft !== before.get(s.key);
    merged[s.key] = edited ? draft : settingDraft(s.value);
  }
  return merged;
}

// ---- Campaign form --------------------------------------------------------

/** Default campaign length when the form opens: open + 30 days (C7). */
export const DEFAULT_CAMPAIGN_WINDOW_DAYS = 30;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * ISO instant → the `YYYY-MM-DDTHH:mm` a `datetime-local` input wants, in the
 * reader's local time. Blank or unparsable → "".
 */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `datetime-local` value → ISO instant, or undefined when blank/invalid. */
export function fromLocalInput(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/** The default close for a given open (local input values both): +30 days. */
export function defaultClosesAt(opensLocal: string, days: number = DEFAULT_CAMPAIGN_WINDOW_DAYS): string {
  if (!opensLocal) return "";
  const d = new Date(opensLocal);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return toLocalInput(d.toISOString());
}

/** Comma-separated tags → the contract's list (trimmed, lower-cased, unique). */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const t of raw.split(",")) {
    const tag = t.trim().toLowerCase();
    if (tag) seen.add(tag);
  }
  return [...seen];
}

function isHttpsUrl(raw: string): boolean {
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}

export interface CampaignFormValues {
  resourceUrn: string;
  ownerUrn: string;
  resourceUrl: string;
  title: string;
  summary: string;
  imageUrl: string;
  categoryCode: string;
  tags: string;
  /** `datetime-local` values. */
  opensAt: string;
  closesAt: string;
}

/**
 * What the backend would refuse, caught before the request: the draft's
 * required fields (`resourceUrn`, `ownerUrn` on create; title, category), the
 * contract's lengths, HTTPS-only URLs (`optionalHttps`), and a window that
 * closes after it opens (`INVALID_WINDOW`). Null when the form can be sent.
 */
export function campaignFormError(values: CampaignFormValues, isEdit: boolean): string | null {
  const title = values.title.trim();
  if (!title) return "A title is required.";
  if (title.length > 200) return "Keep the title to 200 characters.";
  if (!values.categoryCode) return "Pick a category.";
  if (!isEdit) {
    if (!values.resourceUrn.trim()) return "The resource URN is required (e.g. urn:li:share:7123).";
    if (!values.ownerUrn.trim()) return "The owner URN is required (e.g. urn:li:organization:1477).";
  }
  if (values.summary.trim().length > 2000) return "Keep the summary to 2000 characters.";
  if (values.imageUrl.trim() && !isHttpsUrl(values.imageUrl.trim())) return "The image URL must be an https:// address.";
  if (!isEdit && values.resourceUrl.trim() && !isHttpsUrl(values.resourceUrl.trim())) {
    return "The resource URL must be an https:// address.";
  }
  const tags = parseTags(values.tags);
  if (tags.length > 20) return "Use at most 20 tags.";
  if (tags.some((t) => t.length > 50)) return "Keep each tag to 50 characters.";
  const opens = fromLocalInput(values.opensAt);
  const closes = fromLocalInput(values.closesAt);
  if (opens && closes && new Date(closes).getTime() <= new Date(opens).getTime()) {
    return "The campaign must close after it opens.";
  }
  return null;
}
