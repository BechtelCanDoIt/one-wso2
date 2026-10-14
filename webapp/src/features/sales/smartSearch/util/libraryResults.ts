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

import type { SmartSearchContent, SmartSearchSource } from "../api/smartSearchTypes";
import { embedUrlFor, openTargetFor } from "./libraryOpenTargets";

export type ResultKind = "document" | "slides" | "sheet" | "pdf" | "video" | "web" | "link";

/** The order the type filter lists kinds in. */
export const KIND_ORDER: readonly ResultKind[] = ["document", "slides", "sheet", "pdf", "video", "web", "link"];

export const KIND_LABEL: Record<ResultKind, string> = {
  document: "Documents",
  slides: "Decks",
  sheet: "Sheets",
  pdf: "PDFs",
  video: "Videos",
  web: "Web pages",
  link: "Links",
};

/** The singular name shown on one result. */
export const KIND_NAME: Record<ResultKind, string> = {
  document: "Document",
  slides: "Slides",
  sheet: "Sheet",
  pdf: "PDF",
  video: "Video",
  web: "Web page",
  link: "Link",
};

/** What kind of thing a passage came from. */
export function kindOf(source: SmartSearchSource): ResultKind {
  if (source.unitLabel === "Moment") return "video";
  switch ((source.fileExtension ?? "").toLowerCase()) {
    case "pdf":
      return "pdf";
    case "pptx":
    case "ppt":
      return "slides";
    case "xlsx":
    case "xls":
    case "csv":
      return "sheet";
    case "docx":
    case "doc":
      return "document";
    case "webpage":
      return "web";
    case "reference":
      return "link";
    default:
      if (source.unitLabel === "Slide") return "slides";
      if (source.unitLabel === "Sheet") return "sheet";
      return "document";
  }
}

// The video moment is already in the link's query string or hash (?t=90 or #t=90s).
export function parseVideoTimestampSeconds(nativeLink: string): number | null {
  try {
    const url = new URL(nativeLink);
    const seconds = parseInt(url.searchParams.get("t") ?? url.hash.match(/t=(\d+)/)?.[1] ?? "", 10);
    return Number.isFinite(seconds) ? seconds : null;
  } catch {
    return null;
  }
}

export function formatVideoTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** One matching passage, with everything the screen needs to show and open it. */
export interface Passage {
  source: SmartSearchSource;
  /** Where in the document: "Slide 7", "Page 12", "14:30"; null when it has no position. */
  location: string | null;
  /** Where a click goes, in a new tab; null when there is nowhere safe. */
  openUrl: string | null;
  /** An address that can be framed in the page; null when it must open in a new tab. */
  embedUrl: string | null;
}

/** All the passages of one document, which is one result. */
export interface ResultGroup {
  /** Stable within a search: the content id, else the link, else the title. */
  key: string;
  documentId: string;
  title: string;
  kind: ResultKind;
  content: SmartSearchContent | undefined;
  /** In the order the service ranked them, best first. */
  passages: Passage[];
  /** The best passage's closeness to the question. */
  score: number;
}

function passageOf(source: SmartSearchSource, kind: ResultKind, query: string): Passage {
  const seconds = kind === "video" ? parseVideoTimestampSeconds(source.nativeLink) : null;
  let location: string | null = null;
  if (seconds !== null) {
    location = formatVideoTimestamp(seconds);
  } else if (source.page !== null && source.page !== undefined) {
    location = `${source.unitLabel || "Page"} ${source.page}`;
  }
  return { source, location, openUrl: openTargetFor(source, query), embedUrl: embedUrlFor(source) };
}

/** One result per document, in the order its best passage ranked, with the Pitstop item's own title where there is one. */
export function groupResults(
  sources: readonly SmartSearchSource[],
  contents: readonly SmartSearchContent[],
  query: string,
): ResultGroup[] {
  const contentById = new Map(contents.map((content) => [String(content.contentId), content]));
  const groups: ResultGroup[] = [];
  const byKey = new Map<string, ResultGroup>();

  for (const source of sources) {
    const key = source.documentId || (source.driveLink ? `link:${source.driveLink}` : `title:${source.title}`);
    const kind = kindOf(source);
    let group = byKey.get(key);
    if (!group) {
      const content = contentById.get(source.documentId);
      group = {
        key,
        documentId: source.documentId,
        title: content?.description?.trim() || source.title,
        kind,
        content,
        passages: [],
        score: source.similarityScore,
      };
      byKey.set(key, group);
      groups.push(group);
    }
    group.passages.push(passageOf(source, kind, query));
    group.score = Math.max(group.score, source.similarityScore);
  }
  return groups;
}

/** The kinds present in a set of results, in a fixed order, for the type filter. */
export function availableKinds(groups: readonly ResultGroup[]): ResultKind[] {
  const present = new Set(groups.map((group) => group.kind));
  return KIND_ORDER.filter((kind) => present.has(kind));
}

export function filterGroups(groups: readonly ResultGroup[], kind: ResultKind | "all"): ResultGroup[] {
  return kind === "all" ? [...groups] : groups.filter((group) => group.kind === kind);
}

export interface Strength {
  /** 1 to 3 filled dots. */
  level: 1 | 2 | 3;
  label: string;
}

/** How closely a result matches. Cut-offs come from real searches: specific questions land near 0.8, broad ones 0.7 to 0.78. */
export function strengthOf(score: number): Strength {
  if (score >= 0.78) return { level: 3, label: "Strong match" };
  if (score >= 0.7) return { level: 2, label: "Good match" };
  return { level: 1, label: "Related" };
}

const MONTH_FORMAT = new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" });

export interface Freshness {
  label: string;
  /** True once the item is a year or more old, so a seller double-checks it before sending it on. */
  stale: boolean;
}

/** When an item was added to Pitstop, as a label. Null when the date can't be read. */
export function freshnessOf(createdOn: string | undefined, now: Date = new Date()): Freshness | null {
  const match = createdOn?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const added = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(added.getTime())) return null;
  const months = (now.getUTCFullYear() - added.getUTCFullYear()) * 12 + (now.getUTCMonth() - added.getUTCMonth());
  const stale = months >= 12;
  const when = MONTH_FORMAT.format(added);
  return { label: stale ? `Added ${when} - check it is still current` : `Added ${when}`, stale };
}

/** False when the index changed between the two calls, so the answer would cite documents the reader can't see. */
export function sameDocuments(shown: readonly ResultGroup[], answerSources: readonly SmartSearchSource[]): boolean {
  const shownIds = new Set(shown.map((group) => group.documentId));
  const answerIds = new Set(answerSources.map((source) => source.documentId));
  return shownIds.size === answerIds.size && [...answerIds].every((id) => shownIds.has(id));
}
