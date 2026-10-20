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

import { amplifyPostLinkOrigins } from "@config/apiConfig";

// The post kinds amplify-api accepts (parsePostUrn in amplify-common).
const URN = /urn:li:(share|ugcPost|article|video|document|event|activity):([A-Za-z0-9_-]{1,100})/;
// The public "copy link" form: /posts/wso2_some-slug-activity-7123-AbCd
const ACTIVITY_SLUG = /-activity-(\d{1,100})-/;

/**
 * `scheme://host[:port]` of an http(s) URL, lowercase, or null for anything
 * else (other schemes, credentials in the URL, not a URL at all).
 */
export function originOf(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
  return url.origin.toLowerCase();
}

/** Whether a link may be sent, shown or followed: its origin is on the allowed list (LinkedIn by default). */
export function isAllowedLink(raw: string | null | undefined, origins: readonly string[] = amplifyPostLinkOrigins): boolean {
  if (!raw) return false;
  const origin = originOf(raw);
  return origin !== null && origins.includes(origin);
}

/**
 * The post URN inside a LinkedIn post URL, or null when there is none.
 *
 * Accepts the two forms people paste: the feed form
 * (`/feed/update/urn:li:share:7123/`, also URL-encoded) and the "copy link"
 * form (`/posts/<slug>-activity-7123-xyz`). A bare URN works too. A URL on any
 * other host is refused, even if it carries a URN: every employee's card would
 * link to it.
 */
export function postUrnFromUrl(raw: string, origins: readonly string[] = amplifyPostLinkOrigins): string | null {
  const value = raw.trim();
  if (!value) return null;
  // Anything with a scheme except `urn:` is a link (https:, http:, javascript:, …) and must pass the origin check.
  const looksLikeUrl = /^[a-z][a-z0-9+.-]*:/i.test(value) && !/^urn:/i.test(value);
  if (looksLikeUrl && !isAllowedLink(value, origins)) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // A stray % — read it as typed.
  }
  const urn = URN.exec(decoded);
  if (urn) return `urn:li:${urn[1]}:${urn[2]}`;
  const slug = ACTIVITY_SLUG.exec(decoded);
  if (slug && looksLikeUrl && /\/posts\//i.test(decoded)) return `urn:li:activity:${slug[1]}`;
  return null;
}

/** The public URL for a post. The stored link only if its origin is allowed; otherwise built from the URN. */
export function linkedInPostUrl(resourceUrn: string, resourceUrl?: string | null): string {
  if (resourceUrl && isAllowedLink(resourceUrl)) return resourceUrl;
  return `https://www.linkedin.com/feed/update/${resourceUrn}/`;
}

/** `yyyy-mm-dd` for a date input, `days` after `from`. */
export function dateInputValue(from: Date, days = 0): string {
  const d = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/** End of that day in UTC, as the ISO timestamp amplify-api expects for `closesAt`. */
export function closesAtFromDateInput(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return `${value}T23:59:59Z`;
}
