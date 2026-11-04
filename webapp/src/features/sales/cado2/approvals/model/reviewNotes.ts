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

// The words of a lens note (D129), from the rule sentences the backend sends.

import type { LensRole, ReviewNote } from "@features/sales/cado2/approvals/api/approvalTypes";
import { parseReason } from "./myApprovals";

/** What a note says: a short title, the detail, and who it concerns. */
export interface NoteText {
  readonly title: string;
  readonly detail: string;
  readonly who: string;
}

const joinRoles = (roles: readonly string[]) =>
  roles.length === 1 ? roles[0] : `${roles.slice(0, -1).join(", ")} and ${roles.at(-1)}`;

/**
 * A note's words. A line's discount reads "18% discount" / "Above the
 * Regional Director's 15% limit" / "Regional Director approves after you";
 * Deal Desk's own checks say so.
 */
export function noteText(n: ReviewNote, role: LensRole): NoteText {
  const first = n.reasons[0] ?? "";
  let title: string;
  let detail: string;
  switch (n.rule) {
    case "AM_CATEGORY":
      title = "Category chosen by the AM";
      detail = first.slice(first.lastIndexOf(": ") + 2);
      break;
    case "RENEWAL_START":
      title = "Start date";
      detail = first;
      break;
    case "SEE_SPECIAL_TERMS":
      title = "Billing: See Special Terms";
      detail = "Describe the billing in the special terms";
      break;
    default: {
      const row = parseReason(n.rule, n.lineNumber, first);
      title = row.figure ? `${row.figure} discount` : row.title;
      detail = row.detail;
    }
  }
  let who: string;
  if (n.yoursToWrite) who = "Yours to write";
  else if (n.roles.length) who = `${joinRoles(n.roles)} approve${n.roles.length === 1 ? "s" : ""} after you`;
  else if (role === "DEAL_DESK") who = "Only Deal Desk checks this";
  else who = "Why you're asked";
  return { title, detail, who };
}

/** Who marked it, short: the name before the @. */
const shortName = (email: string | null) => (email ? email.split("@")[0] : "someone");

/**
 * The note's state in words: "To look at", "Looks fine · priya", "Looks fine
 * on v1 · priya", "Changed since v1", or "Approved · priya" once the role approved.
 */
export function stateLabel(n: ReviewNote): string {
  if (n.state === "CHANGED") return `Changed since v${n.markedOnVersion ?? "?"}`;
  if (n.state !== "FINE") return "To look at";
  if (n.byApproval) return `Approved · ${shortName(n.markedByEmail)}`;
  if (n.yoursToWrite) return "Written";
  return n.markedOnVersion ? `Looks fine on v${n.markedOnVersion} · ${shortName(n.markedByEmail)}` : `Looks fine · ${shortName(n.markedByEmail)}`;
}
