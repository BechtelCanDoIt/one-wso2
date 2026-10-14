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
const CHAT_ANSWER_MAX_LENGTH = 280;

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
    const lines = [`Subject: ${truncate(query.trim(), SUBJECT_MAX_LENGTH)}`, "", "Hi [Name],", ""];
    lines.push(trimmedAnswer ?? "Here is where to start:");
    if (entries.length > 0) {
      lines.push("", ...(trimmedAnswer ? ["Where to find more:"] : []));
      lines.push(...entries.map((entry) => `- ${withLocation(entry)}: ${entry.url}`));
    }
    lines.push("", "Best regards,");
    return lines.join("\n");
  }

  if (format === "chat") {
    const lines = [trimmedAnswer ? truncate(trimmedAnswer, CHAT_ANSWER_MAX_LENGTH) : query.trim()];
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
