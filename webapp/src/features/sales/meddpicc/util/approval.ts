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

// What the deal page sends on Approve all, kept out of the component so the
// rules can be tested on their own.
//
// The backend owns the semantics (contract §3.6, "Approve all semantics"): a
// field's final value is the AM's edit when there is one, otherwise the pending
// Proposal. This file only decides what the AM has said, and whether the
// request is complete enough to send — the backend answers 400 to a pending
// role Proposal with neither a contact match, a new Contact nor a clear.

import type { ApproveRequest, DealField, FieldValue, NewContact, RoleProposalValue } from "../types";
import { isRoleProposal } from "./meddpiccFormat";

/** The AM's unsaved answers on the deal page. */
export interface ApprovalDraft {
  /** fieldKey -> value. null means "clear" (for a role: "not known, leave unset"). */
  edits: Record<string, FieldValue>;
  /** Role fieldKey -> the Contact the AM matched the proposed person to. */
  roleMatches: Record<string, string>;
  /** Role fieldKey -> the Contact the AM asked to create, because the person is not one yet. Optional: a draft without one has asked for none. */
  newContacts?: Record<string, NewContact>;
}

export const EMPTY_DRAFT: ApprovalDraft = { edits: {}, roleMatches: {}, newContacts: {} };

/** Role fields whose Proposal is waiting for approval. */
export function pendingRoleFields(fields: readonly DealField[]): DealField[] {
  return fields.filter((field) => field.kind === "role" && field.proposal?.pending);
}

/**
 * The contact picker's starting point: the backend's suggested Contact for
 * every pending role, where it had one confident enough to suggest.
 */
export function initialRoleMatches(fields: readonly DealField[]): Record<string, string> {
  const matches: Record<string, string> = {};
  for (const field of pendingRoleFields(fields)) {
    const value = field.proposal?.value;
    if (isRoleProposal(value) && value.suggestedContactId) {
      matches[field.key] = value.suggestedContactId;
    }
  }
  return matches;
}

function hasEdit(draft: ApprovalDraft, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(draft.edits, key);
}

/**
 * Pending role Proposals the AM has neither matched to a Contact, asked to create, nor
 * cleared. Approve all stays disabled while this is non-empty.
 */
export function unmatchedRoles(fields: readonly DealField[], draft: ApprovalDraft): DealField[] {
  return pendingRoleFields(fields).filter(
    (field) =>
      !(hasEdit(draft, field.key) && draft.edits[field.key] === null) &&
      !draft.roleMatches[field.key] &&
      !draft.newContacts?.[field.key],
  );
}

/** True when Approve all would change something: a pending Proposal, or an edit. */
export function hasSomethingToApprove(fields: readonly DealField[], draft: ApprovalDraft): boolean {
  return fields.some((field) => field.proposal?.pending || hasEdit(draft, field.key));
}

/**
 * The Contact form's starting point for a person heard on a call: the last word of the
 * name is the last name (Salesforce needs one), the rest the first name, the title as
 * heard. The email is the AM's to fill in; nothing on a call says it.
 */
export function newContactFromProposal(value: RoleProposalValue): NewContact {
  const words = value.name.trim().split(/\s+/).filter(Boolean);
  const lastName = words.length ? (words[words.length - 1] as string) : "";
  const firstName = words.slice(0, -1).join(" ");
  return { firstName: firstName || null, lastName, email: "", title: value.title };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What stops a new Contact being created, in the AM's words; null when nothing does. */
export function newContactProblem(contact: NewContact): string | null {
  if (!contact.lastName.trim()) return "a last name is needed";
  if (!contact.email.trim()) return "an email is needed";
  if (!EMAIL.test(contact.email.trim())) return "the email doesn't look right";
  return null;
}

/** The Contact's name as Salesforce will show it. */
export function newContactName(contact: NewContact): string {
  return [contact.firstName?.trim(), contact.lastName.trim()].filter(Boolean).join(" ");
}

/**
 * The request body for POST /deals/{id}/approve.
 *
 * Only keys the deal actually has are sent, and only for fields an AM can
 * answer here — a Salesforce-only field is filled in Salesforce. A role's edit
 * can only be a clear; picking a Contact is a roleMatch, asking for a new one a
 * newContact (sent only when there is one, for an older backend's sake), and a
 * role that was cleared sends neither alongside it.
 */
export function buildApproveRequest(fields: readonly DealField[], draft: ApprovalDraft): ApproveRequest {
  const edits: Record<string, FieldValue> = {};
  const roleMatches: Record<string, string> = {};
  const newContacts: Record<string, NewContact> = {};

  for (const field of fields) {
    if (!field.conversational || field.kind === "salesforceOnly") continue;
    const edited = hasEdit(draft, field.key);

    if (field.kind === "role") {
      if (edited && draft.edits[field.key] === null) {
        edits[field.key] = null;
        continue;
      }
      if (!field.proposal?.pending) continue;
      const fresh = draft.newContacts?.[field.key];
      if (fresh) {
        newContacts[field.key] = {
          firstName: fresh.firstName?.trim() || null,
          lastName: fresh.lastName.trim(),
          email: fresh.email.trim(),
          title: fresh.title?.trim() || null,
        };
        continue;
      }
      const match = draft.roleMatches[field.key];
      if (match) roleMatches[field.key] = match;
      continue;
    }

    if (edited) edits[field.key] = draft.edits[field.key];
  }

  const request: ApproveRequest = { edits, roleMatches };
  if (Object.keys(newContacts).length > 0) request.newContacts = newContacts;
  return request;
}

/** What Approve all is about to do, in plain words, for the line beside the button. */
export interface ApprovalSummary {
  /** Labels of the fields written to Salesforce: pending Proposals and edits. */
  write: string[];
  /** Labels of the fields kept in Echo only (not Salesforce fields yet). */
  keep: string[];
  /** "Grace Lim as Economic buyer", for each Contact to create. */
  create: string[];
}

export function approvalSummary(fields: readonly DealField[], draft: ApprovalDraft): ApprovalSummary {
  const summary: ApprovalSummary = { write: [], keep: [], create: [] };
  for (const field of fields) {
    if (!field.conversational || field.kind === "salesforceOnly") continue;
    const edited = hasEdit(draft, field.key);
    const cleared = edited && draft.edits[field.key] === null;
    if (!field.proposal?.pending && !edited) continue;
    const fresh = field.kind === "role" && !cleared ? draft.newContacts?.[field.key] : undefined;
    if (fresh) {
      summary.create.push(`${newContactName(fresh) || "the new contact"} as ${field.label.toLowerCase()}`);
      continue;
    }
    if (field.notInSalesforce) summary.keep.push(field.label);
    else summary.write.push(field.label);
  }
  return summary;
}

/** One sentence for the summary: "Writes Decision process and Champion to Salesforce, and creates Grace Lim as economic buyer." */
export function describeApproval(summary: ApprovalSummary): string {
  const parts: string[] = [];
  if (summary.write.length) parts.push(`writes ${listOf(summary.write)} to Salesforce`);
  if (summary.create.length) parts.push(`creates ${listOf(summary.create)}`);
  if (summary.keep.length) parts.push(`keeps ${listOf(summary.keep)} in Echo (not Salesforce fields yet)`);
  if (parts.length === 0) return "";
  const sentence = parts.join(", and ");
  return `Approve all ${sentence}.`;
}

function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
