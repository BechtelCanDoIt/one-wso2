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

import type { HistoryEntry } from "../../api/riskApi";
import { STATUS_CONFIG, changedValue, fieldLabel } from "./utils";

// Shared by the risk drawer's History tab and Risk Hub > Audit Trail, so one
// event reads the same wherever it is shown.

// Tone drives the dot colour only — the sentence carries the meaning, so a
// missing tone degrades to neutral rather than hiding the entry.
export type Tone = "created" | "approved" | "rejected" | "escalated" | "neutral";

export const TONE_COLORS: Record<Tone, string> = {
  created: "#2563eb",
  approved: "#16a34a",
  rejected: "#dc2626",
  escalated: "#ea580c",
  neutral: "#94a3b8",
};

// statusLabel renders a workflow status the way the rest of the UI does, so the
// timeline and the status chips never disagree on wording.
function statusLabel(status?: string): string {
  if (!status) return "";
  return STATUS_CONFIG[status]?.label ?? status.replace(/_/g, " ").toLowerCase();
}


export interface Rendered {
  title: string;
  body?: string;
  tone: Tone;
}

// entryToSentence maps an action plus its payload to one human line.
//
// The default case renders an unrecognised action generically rather than
// dropping it — the same choice the Audit Hub's ControlHistoryTimeline makes,
// so adding a new action server-side stays visible without a frontend release.
export function entryToSentence(e: HistoryEntry): Rendered {
  const d = e.details ?? {};
  const transition =
    d.from && d.to ? `${statusLabel(d.from)} → ${statusLabel(d.to)}` : d.to ? statusLabel(d.to) : undefined;

  switch (e.action) {
    case "CREATE":
      return d.plan
        ? { title: `Action plan added — ${d.plan}`, tone: "created" }
        : { title: "Risk created", tone: "created" };
    case "SUBMIT":
      return { title: "Submitted for approval", body: transition, tone: "neutral" };
    case "APPROVE":
      return { title: `Approved by ${d.role ?? "approver"}`, body: transition, tone: "approved" };
    case "REJECT":
      return {
        title: `Rejected${d.stage ? ` at ${d.stage.replace(/_/g, " ").toLowerCase()}` : ""}`,
        body: [transition, d.comment].filter(Boolean).join(" · "),
        tone: "rejected",
      };
    case "ESCALATE":
      return {
        title: d.overdueDays ? `Escalated — overdue by ${d.overdueDays} days` : "Escalated — remediation overdue",
        body: transition,
        tone: "escalated",
      };
    case "COMMENT":
      return { title: "Escalation reviewed", body: d.comment, tone: "escalated" };
    case "ASSESS":
      return {
        title: d.previousLevel && d.level ? `Reassessed ${d.previousLevel} → ${d.level}` : `Reassessed${d.level ? ` — ${d.level}` : ""}`,
        body: d.comment,
        tone: "neutral",
      };
    case "COMPLETE":
      return d.plan
        ? { title: `Action plan completed — ${d.plan}`, tone: "approved" }
        : { title: "Submitted for completion approval", body: transition, tone: "neutral" };
    case "CLOSE":
      return { title: "Risk closed", body: transition, tone: "approved" };
    case "CANCEL":
      return { title: "Risk cancelled", tone: "neutral" };
    case "UPDATE": {
      if (!e.field_changed) return { title: "Risk updated", tone: "neutral" };
      const from = changedValue(e.field_changed, e.old_value);
      const to = changedValue(e.field_changed, e.new_value);
      return {
        title: `Changed ${fieldLabel(e.field_changed)}`,
        // Rows with no recorded before/after render as a bare "changed" line.
        body: from || to ? `${from || "—"} → ${to || "—"}` : undefined,
        tone: "neutral",
      };
    }
    default:
      return { title: e.action.replace(/_/g, " ").toLowerCase(), tone: "neutral" };
  }
}
