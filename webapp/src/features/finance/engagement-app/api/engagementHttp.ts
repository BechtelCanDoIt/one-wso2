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

import { fetchWithReauth, HttpError } from "@api/http";
import { timelineItem } from "./engagementMappers";
import type { TimelineItem } from "./engagementTypes";
import type { WTimelineItem } from "./engagementWire";

/** A report as CSV (GET /reports/{report}?format=csv). */
export async function engagementCsv(url: string, accessToken: string): Promise<Blob> {
  // The report endpoints answer CSV for `format=csv` (the caller's URL carries it).
  const res = await fetchWithReauth(url, { headers: { Accept: "text/csv" } }, accessToken);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new HttpError(url, res.status, body);
  }
  const type = (res.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "text/csv") throw new HttpError(url, res.status, "");
  return new Blob([await res.text()], { type: "text/csv;charset=utf-8" });
}

/** Passport and visa images. Anything else is refused: a `blob:` document runs with the app's origin. */
const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png"]);

export async function engagementFile(url: string, accessToken: string): Promise<Blob> {
  const res = await fetchWithReauth(url, {}, accessToken);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new HttpError(url, res.status, body);
  }
  const blob = await res.blob();
  const type = (res.headers.get("Content-Type") ?? blob.type).split(";")[0].trim().toLowerCase();
  if (!ALLOWED_FILE_TYPES.has(type)) throw new HttpError(url, res.status, "");
  return blob.type === type ? blob : new Blob([blob], { type });
}

/** A form upload (a file and its fields) that answers with a JSON body or nothing. */
export async function engagementUpload<T>(
  url: string,
  accessToken: string,
  form: FormData,
  method: "POST" | "PUT" = "POST",
  idempotencyKey?: string,
): Promise<T | null> {
  // No Content-Type: the browser sets multipart/form-data with its boundary.
  const headers: Record<string, string> = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {};
  const res = await fetchWithReauth(url, { method, body: form, headers }, accessToken);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new HttpError(url, res.status, body);
  }
  // A 2xx whose body can't be read is not a success: the server may have saved it, so the error must surface.
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(url, res.status, text);
  }
}

/** The default (team) allocations a 409 from POST /engagements/{id}/allocations says would be trimmed or split; empty for any other error. */
export function defaultOverlapsOf(error: unknown): readonly TimelineItem[] {
  if (!(error instanceof HttpError) || error.status !== 409 || !error.responseBody) return [];
  try {
    const body = JSON.parse(error.responseBody) as { defaultOverlaps?: unknown };
    return Array.isArray(body.defaultOverlaps) ? (body.defaultOverlaps as WTimelineItem[]).map(timelineItem) : [];
  } catch {
    return [];
  }
}

/** Errors the Engagement App words itself; anything else is returned unchanged. */
export function eaError(error: unknown): unknown {
  if (!(error instanceof HttpError)) return error;
  if (error.status === 422) return new Error("This was already sent with different details. Close it and try again.");
  if (error.status === 400 && /too large/i.test(error.responseBody)) return new Error("The result is too large. Choose a shorter date range.");
  return error;
}
