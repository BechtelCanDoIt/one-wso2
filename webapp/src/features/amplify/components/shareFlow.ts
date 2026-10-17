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

export interface PendingShare {
  campaignId: string;
  campaignTitle?: string;
  kind: ShareKind;
  commentary?: string;
  /** Where to send the reader once LinkedIn is done — the page they left. */
  returnTo: string;
}

export interface ConnectResult {
  status: "ok" | "error";
  message?: string;
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

export function savePendingShare(share: PendingShare): void {
  write(PENDING_SHARE_KEY, share);
}

export function loadPendingShare(): PendingShare | null {
  return read<PendingShare>(PENDING_SHARE_KEY);
}

export function clearPendingShare(): void {
  remove(PENDING_SHARE_KEY);
}

export function saveConnectResult(result: ConnectResult): void {
  write(CONNECT_RESULT_KEY, result);
}

/** Reads the result and clears it — a one-shot signal, not a sticky flag. */
export function consumeConnectResult(): ConnectResult | null {
  const result = read<ConnectResult>(CONNECT_RESULT_KEY);
  if (result) remove(CONNECT_RESULT_KEY);
  return result;
}

export function clearConnectResult(): void {
  remove(CONNECT_RESULT_KEY);
}

export const CONNECT_RESULT_STORAGE_KEY = CONNECT_RESULT_KEY;
