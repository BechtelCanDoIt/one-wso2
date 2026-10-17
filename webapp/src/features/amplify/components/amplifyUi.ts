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

// The small shared bits every Amplify screen uses: date/duration formatting,
// the status→chip-colour map, and the button style that keeps Amplify's
// buttons from shouting in sentence case. Kept in one file so the Posts card
// and the PO queue's row cannot render the same status in two colours.

import type { SxProps, Theme } from "@wso2/oxygen-ui";
import type { CampaignStatus, ConnectionStatus, ExternalShareStatus, ShareStatus } from "../api/amplifyTypes";

/** Sentence case: MUI uppercases buttons by default, which reads as shouting. */
export const amplifyBtnSx: SxProps<Theme> = { textTransform: "none", fontWeight: 600 };

type ChipColor = "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";

export function campaignStatusColor(status: CampaignStatus): ChipColor {
  switch (status) {
    case "OPEN":
      return "success";
    case "SCHEDULED":
      return "info";
    case "CLOSED":
      return "warning";
    case "ARCHIVED":
      return "default";
  }
}

export function shareStatusColor(status: ShareStatus): ChipColor {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "QUEUED":
      return "info";
    case "FAILED":
      return "error";
  }
}

export function externalShareStatusColor(status: ExternalShareStatus): ChipColor {
  switch (status) {
    case "APPROVED":
      return "info";
    case "AMPLIFIED":
      return "success";
    case "REJECTED":
      return "error";
    case "PENDING":
      return "warning";
  }
}

export function connectionStatusColor(status: ConnectionStatus): ChipColor {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "EXPIRING":
      return "warning";
    case "NEEDS_RECONNECT":
      return "error";
    case "REMOVED":
      return "default";
    case "NOT_CONNECTED":
      return "default";
  }
}

export function connectionStatusLabel(status: ConnectionStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Connected";
    case "EXPIRING":
      return "Expiring soon";
    case "NEEDS_RECONNECT":
      return "Reconnect needed";
    case "REMOVED":
      return "Removed";
    case "NOT_CONNECTED":
      return "Not connected";
  }
}

/** `2026-10-17T09:00:00Z` → `17 Oct 2026`. Invalid input is passed through. */
export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `2026-10` → `Oct 2026`, for the monthly-history table. */
export function formatMonthLabel(month: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return month;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/** "in 3 days" / "2 days ago" — for "closes" and "last activity". */
export function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMs = d.getTime() - Date.now();
  const past = diffMs < 0;
  const days = Math.round(Math.abs(diffMs) / 86_400_000);
  if (days === 0) return past ? "today" : "today";
  if (days === 1) return past ? "yesterday" : "tomorrow";
  if (days < 30) return past ? `${days} days ago` : `in ${days} days`;
  return formatDate(iso);
}

/** Rank movement, as a chip-ready label. `0`/undefined reads as "no change". */
export function rankDelta(rank: number, previousRank?: number): { label: string; dir: "up" | "down" | "same" } {
  if (previousRank === undefined || previousRank === rank) return { label: "—", dir: "same" };
  if (previousRank > rank) return { label: `▲ ${previousRank - rank}`, dir: "up" };
  return { label: `▼ ${rank - previousRank}`, dir: "down" };
}
