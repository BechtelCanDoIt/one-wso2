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

import type { ResultGroup } from "./libraryResults";

export type CopyFormat = "email" | "chat" | "plain";

export const COPY_FORMATS: readonly { id: CopyFormat; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "chat", label: "Chat" },
  { id: "plain", label: "Plain" },
];

/** How many results go into what is copied: enough to start from, not a dump. */
const MAX_COPIED = 3;
const SUBJECT_MAX_LENGTH = 80;
// Only a safety net, under the limit of the chat apps (Google Chat takes 4,096): an answer is not shortened below this.
const CHAT_ANSWER_MAX_LENGTH = 3000;

interface CopyEntry {
  title: string;
  location: string | null;
  url: string;
}

function entriesOf(groups: readonly ResultGroup[]): CopyEntry[] {
  const entries: CopyEntry[] = [];
  for (const group of groups) {
    // The best passage that has somewhere to go; a result with no link can't be pointed to.
    const passage = group.passages.find((candidate) => candidate.openUrl !== null);
    if (passage?.openUrl) entries.push({ title: group.title, location: passage.location, url: passage.openUrl });
    if (entries.length >= MAX_COPIED) break;
  }
  return entries;
}

const withLocation = (entry: CopyEntry): string => (entry.location ? `${entry.title} (${entry.location})` : entry.title);

const truncate = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`;

/** Cut at the end of a sentence that fits; failing that, at a word, with an ellipsis. */
function truncateAtSentence(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const fitting = text.slice(0, maxLength);
  const lastStop = Math.max(fitting.lastIndexOf(". "), fitting.lastIndexOf("! "), fitting.lastIndexOf("? "));
  if (lastStop >= maxLength / 2) return fitting.slice(0, lastStop + 1);
  const lastSpace = fitting.lastIndexOf(" ", maxLength - 1);
  return `${fitting.slice(0, lastSpace > 0 ? lastSpace : maxLength - 1).trimEnd()}…`;
}

/** The question as a subject line: no closing punctuation, a capital letter, and short. */
function subjectOf(query: string): string {
  const cleaned = query.replace(/\s+/g, " ").trim().replace(/[?.!\s]+$/, "");
  return truncate(cleaned.charAt(0).toUpperCase() + cleaned.slice(1), SUBJECT_MAX_LENGTH);
}

export interface CopyInput {
  query: string;
  /** The written answer, when there is one. */
  answer: string | null;
  groups: readonly ResultGroup[];
}

/**
 * Text to paste into an email, chat or note: the answer plus links to the best documents.
 * Names in [brackets] are for the sender to fill in.
 */
export function buildCopyText(format: CopyFormat, { query, answer, groups }: CopyInput): string {
  const entries = entriesOf(groups);
  const trimmedAnswer = answer?.trim() || null;

  if (format === "email") {
    const lines = [`Subject: ${subjectOf(query)}`, "", "Hi [Name],", ""];
    lines.push(trimmedAnswer ?? "Here are the best places to start:");
    if (entries.length > 0) {
      lines.push("", ...(trimmedAnswer ? ["Where to find more:"] : []));
      entries.forEach((entry, index) => lines.push(`${index + 1}. ${withLocation(entry)}`, `   ${entry.url}`));
    }
    lines.push("", "Best regards,", "[Your name]");
    return lines.join("\n");
  }

  if (format === "chat") {
    const lines = [trimmedAnswer ? truncateAtSentence(trimmedAnswer, CHAT_ANSWER_MAX_LENGTH) : query.trim()];
    lines.push(...entries.map((entry) => `• ${withLocation(entry)} ${entry.url}`));
    return lines.join("\n");
  }

  const lines: string[] = [];
  if (trimmedAnswer) lines.push(trimmedAnswer, "");
  if (entries.length > 0) {
    lines.push("Sources:", ...entries.map((entry, index) => `${index + 1}. ${withLocation(entry)} - ${entry.url}`));
  }
  return lines.length > 0 ? lines.join("\n") : query.trim();
}

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * The email again as HTML, so that pasted into Gmail or Outlook each source is a clickable title and not a long
 * address. Every piece of text is escaped, and every link was already checked as https before it got here.
 */
export function buildCopyHtml({ query, answer, groups }: CopyInput): string {
  const entries = entriesOf(groups);
  const trimmedAnswer = answer?.trim() || null;
  const paragraph = (text: string) => `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
  const parts = [paragraph(`Subject: ${subjectOf(query)}`), paragraph("Hi [Name],")];
  parts.push(paragraph(trimmedAnswer ?? "Here are the best places to start:"));
  if (entries.length > 0) {
    if (trimmedAnswer) parts.push(paragraph("Where to find more:"));
    const items = entries.map((entry) => `<li><a href="${escapeHtml(entry.url)}">${escapeHtml(withLocation(entry))}</a></li>`);
    parts.push(`<ol>${items.join("")}</ol>`);
  }
  parts.push(`<p>Best regards,<br>[Your name]</p>`);
  return parts.join("");
}

/** Whether the browser can put formatted text on the clipboard, which is what makes the email's links clickable. */
export const canCopyRich = (): boolean => typeof ClipboardItem !== "undefined" && Boolean(navigator.clipboard?.write);

/** Copies the text, and the formatted version beside it when there is one; plain text is the fallback. */
export async function writeToClipboard(text: string, html?: string): Promise<void> {
  if (html && canCopyRich()) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return;
    } catch {
      // Refused or unsupported: the plain text below still works.
    }
  }
  await navigator.clipboard.writeText(text);
}
