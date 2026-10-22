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

// The Runner opens this URL in a real browser on the Engineer's machine.
// Which portals it may open is decided by the server's approved list, and the
// Runner enforces it on the addresses it actually connects to; a URL that
// isn't approved comes back from the server with a message saying so. This
// only checks the form of what was typed -- an https URL with no username or
// password -- so a typo is caught before anything is queued.

export const EMPTY_PORTAL_URL_MESSAGE = "Please enter a URL";
export const UNPARSEABLE_PORTAL_URL_MESSAGE = "That is not a valid URL. Use the form https://...";
export const NON_HTTPS_PORTAL_URL_MESSAGE = "Only https:// URLs are allowed.";
export const CREDENTIALS_PORTAL_URL_MESSAGE = "Remove the username or password from the URL.";

export type ValidateAgentPortalUrlResult =
  | { valid: true; url: string }
  | { valid: false; message: string };

/**
 * Checks the target portal URL an Engineer typed before the Agent Runner page
 * queues a login Agent Task for it. Returns the URL as the parser normalised
 * it, or why it was refused so the page can show the message as is.
 *
 * Plain data in, plain data out — no React, no knowledge of the page.
 */
export function validateAgentPortalUrl(input: string): ValidateAgentPortalUrlResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, message: EMPTY_PORTAL_URL_MESSAGE };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, message: UNPARSEABLE_PORTAL_URL_MESSAGE };
  }

  if (url.protocol !== "https:") {
    return { valid: false, message: NON_HTTPS_PORTAL_URL_MESSAGE };
  }

  if (url.username || url.password) {
    return { valid: false, message: CREDENTIALS_PORTAL_URL_MESSAGE };
  }

  return { valid: true, url: url.href };
}
