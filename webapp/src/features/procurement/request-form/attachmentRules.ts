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

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 10;

const EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "png", "jpg", "jpeg"] as const;

export const ATTACHMENT_ACCEPT = EXTENSIONS.map((e) => `.${e}`).join(",");

export const ATTACHMENT_RULES = "PDF, Word, Excel, PowerPoint, PNG or JPEG, up to 10 MB each, at most 10 files.";

export const emptyAttachments = (): AttachmentsDraft => ({ saved: [], removed: [], files: [] });

/** How many files the request would have if the draft were sent now. */
export const attachmentCount = (a: AttachmentsDraft): number => a.saved.length + a.files.length;

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
  if (file.size > MAX_ATTACHMENT_BYTES) return `"${file.name}" is larger than 10 MB.`;
  if (attachmentCount(current) >= MAX_ATTACHMENTS) return `A request can have at most ${MAX_ATTACHMENTS} files.`;
  return null;
}

/** Whether a saved attachment may be downloaded; a file the scan found infected may not. */
export const canDownload = (a: Attachment): boolean => a.scanStatus !== "infected";
