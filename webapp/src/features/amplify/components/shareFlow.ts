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

// The state a share survives across the LinkedIn round-trip.
//
// The connect flow opens LinkedIn in a NEW TAB. That tab finishes the
// handshake and then has to tell the tab that started it two things: "the
// connection landed" (or failed), and "put the reader back here". A second tab
// has its own sessionStorage, so the handoff has to be localStorage — that is
// the one browser store both tabs share, and the `storage` event is how the
// first tab learns the second one wrote.
//
// The pending share (which campaign, and the commentary already typed) also
// lives here, so returning from LinkedIn reopens the SAME dialog with the
// reader's choices intact rather than an empty one.

import type { ShareKind } from "../api/amplifyTypes";

const PENDING_SHARE_KEY = "amplify.pendingShare";
const CONNECT_RESULT_KEY = "amplify.connect.result";

/**
 * How long a half-finished share (or an unread connect result) is honoured.
 * The OAuth `state` itself dies after 10 minutes; past half an hour the reader
 * has moved on, and reopening a share dialog they abandoned yesterday would be
 * a surprise, not a convenience.
 */
export const HANDOFF_TTL_MS = 30 * 60 * 1000;

/** Where the reader lands when no safe return path is known. */
export const DEFAULT_RETURN_PATH = "/amplify/posts";

export interface PendingShare {
  campaignId: string;
  campaignTitle?: string;
  kind: ShareKind;
  commentary?: string;
  /** Where to send the reader once LinkedIn is done — the page they left. */
  returnTo: string;
  /** Epoch ms when it was saved; older than HANDOFF_TTL_MS is ignored. */
  savedAt?: number;
}

export interface ConnectResult {
  status: "ok" | "error";
  message?: string;
  savedAt?: number;
}

// localStorage can throw in a locked-down browser or a private window; a share
// that cannot be remembered is a share the reader retypes, not a crash.
function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignored — see read() */
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignored */
  }
}

function isFresh(savedAt: unknown, now: number): boolean {
  return typeof savedAt === "number" && now - savedAt >= 0 && now - savedAt <= HANDOFF_TTL_MS;
}

export function savePendingShare(share: PendingShare, now: number = Date.now()): void {
  write(PENDING_SHARE_KEY, { ...share, savedAt: now });
}

/**
 * The pending share, or null when there is none, it is malformed, or it is
 * stale (older than HANDOFF_TTL_MS, or saved before `savedAt` existed). A stale
 * or malformed entry is cleared as it is read.
 */
export function loadPendingShare(now: number = Date.now()): PendingShare | null {
  const share = read<PendingShare>(PENDING_SHARE_KEY);
  if (!share) return null;
  if (typeof share.campaignId !== "string" || typeof share.kind !== "string" || !isFresh(share.savedAt, now)) {
    remove(PENDING_SHARE_KEY);
    return null;
  }
  return share;
}

export function clearPendingShare(): void {
  remove(PENDING_SHARE_KEY);
}

export function saveConnectResult(result: ConnectResult, now: number = Date.now()): void {
  write(CONNECT_RESULT_KEY, { ...result, savedAt: now });
}

/**
 * Reads the result and clears it — a one-shot signal, not a sticky flag. A
 * stale or malformed result is cleared and reads as null.
 */
export function consumeConnectResult(now: number = Date.now()): ConnectResult | null {
  const result = read<ConnectResult>(CONNECT_RESULT_KEY);
  if (!result) return null;
  remove(CONNECT_RESULT_KEY);
  if ((result.status !== "ok" && result.status !== "error") || !isFresh(result.savedAt, now)) return null;
  return result;
}

export function clearConnectResult(): void {
  remove(CONNECT_RESULT_KEY);
}

export const CONNECT_RESULT_STORAGE_KEY = CONNECT_RESULT_KEY;

/**
 * A return path that is safe to navigate to: a same-origin absolute path
 * (`/amplify/posts`). Anything else — a full URL, a protocol-relative `//host`,
 * a backslash trick (`/\\host`, which browsers normalise to `//host`), a
 * `javascript:` string — falls back to DEFAULT_RETURN_PATH. The value comes
 * from storage and from the backend's echo, so it is treated as untrusted.
 */
export function safeReturnPath(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return DEFAULT_RETURN_PATH;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_RETURN_PATH;
  // Control characters (tab/newline are stripped by URL parsers) could smuggle
  // a second slash past the checks above.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(raw)) return DEFAULT_RETURN_PATH;
  try {
    const resolved = new URL(raw, window.location.origin);
    if (resolved.origin !== window.location.origin) return DEFAULT_RETURN_PATH;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return DEFAULT_RETURN_PATH;
  }
}

/**
 * The `ConnectStart.returnTo` pattern from amplify-api's openapi: a relative
 * path, no `//`, backslash or whitespace (`/` alone is allowed).
 */
export const CONNECT_RETURN_TO_PATTERN = /^\/([^/\\\s][^\\\s]*)?$/;

/**
 * A `returnTo` that is safe to send to `POST /connections/linkedin/start`.
 * The server rejects anything off its pattern, so whitespace and backslashes
 * are refused up front (the URL parser would otherwise quietly turn a
 * backslash into a slash), the rest goes through safeReturnPath, and the
 * result is checked against the server pattern. Anything else falls back to
 * the default Amplify page.
 */
export function connectReturnTo(raw: unknown): string {
  if (typeof raw !== "string" || /[\s\\]/.test(raw)) return DEFAULT_RETURN_PATH;
  const safe = safeReturnPath(raw);
  return CONNECT_RETURN_TO_PATTERN.test(safe) ? safe : DEFAULT_RETURN_PATH;
}

/**
 * Fixed copy for amplify-api's 422 `OAUTH_REDIRECT_MISMATCH`: the callback URL
 * that received the code is not the redirect URI Amplify is configured with.
 */
export const OAUTH_REDIRECT_MISMATCH_MESSAGE =
  "This sign-in link doesn't match Amplify's configuration. Please start the LinkedIn connection again from Amplify.";

/**
 * Fixed copy for LinkedIn's OAuth `error` query parameter. The raw value (and
 * its `error_description`) is attacker-controllable text in our URL, so it is
 * never rendered — only mapped.
 */
export function describeOAuthError(code: string | null | undefined): string {
  switch (code) {
    case "user_cancelled_login":
    case "user_cancelled_authorize":
      return "You cancelled the LinkedIn sign-in, so nothing was connected. You can try again whenever you're ready.";
    case "access_denied":
      return "LinkedIn didn't grant Amplify access, so nothing was connected.";
    case undefined:
    case null:
    case "":
      return "LinkedIn did not return an authorization code.";
    default:
      return "LinkedIn couldn't complete the connection. Please try again.";
  }
}
