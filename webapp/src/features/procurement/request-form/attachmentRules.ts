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


// What the backend accepts as an attachment. It checks the file's first bytes as
// well; these checks only spare the person an upload that would be refused.

import type { Attachment, AttachmentsDraft } from "../types";

/** The largest file the backend takes, in bytes. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** The most files the backend keeps on a request. */
export const MAX_ATTACHMENTS = 10;

const EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "png", "jpg", "jpeg"] as const;

/** The extensions of the file picker's `accept`. */
export const ATTACHMENT_ACCEPT = EXTENSIONS.map((e) => `.${e}`).join(",");

/** The largest file, in megabytes. */
const MAX_ATTACHMENT_MB = MAX_ATTACHMENT_BYTES / (1024 * 1024);

/** What the picker tells the person about the files it takes. */
export const ATTACHMENT_RULES = `PDF, Word, Excel, PowerPoint, PNG or JPEG, up to ${MAX_ATTACHMENT_MB} MB each, at most ${MAX_ATTACHMENTS} files.`;

/** A request's files before anything is saved, removed or chosen. */
export const emptyAttachments = (): AttachmentsDraft => ({ saved: [], removed: [], files: [] });

/** How many files the request would have if the draft were sent now. */
export const attachmentCount = (a: AttachmentsDraft): number => a.saved.length + a.files.length;

/** A size in bytes as a person reads it, for example "2 KB" or "1.5 MB". */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** What is wrong with a file about to be added, or null when it can be. */
export function attachmentProblem(file: File, current: AttachmentsDraft): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(EXTENSIONS as readonly string[]).includes(extension)) return `"${file.name}" is not a type that can be attached.`;
  if (file.size === 0) return `"${file.name}" is empty.`;
  if (file.size > MAX_ATTACHMENT_BYTES) return `"${file.name}" is larger than ${MAX_ATTACHMENT_MB} MB.`;
  if (attachmentCount(current) >= MAX_ATTACHMENTS) return `A request can have at most ${MAX_ATTACHMENTS} files.`;
  return null;
}

/** Whether a saved attachment may be downloaded: only once the malware scan has found it clean. */
export const canDownload = (a: Attachment): boolean => a.scanStatus === "clean";

/** Why a saved attachment cannot be downloaded yet, or undefined when it can be. */
export function scanNote(a: Attachment): string | undefined {
  switch (a.scanStatus) {
    case "pending":
      return "Being scanned. It can be downloaded once the scan is clean.";
    case "failed":
      return "The scan did not finish, so it cannot be downloaded.";
    case "infected":
      return "Blocked: the scan found a problem.";
    case "clean":
      return undefined;
  }
}
