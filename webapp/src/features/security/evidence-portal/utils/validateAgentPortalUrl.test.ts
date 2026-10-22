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

import { describe, expect, test } from "vitest";
import {
  CREDENTIALS_PORTAL_URL_MESSAGE,
  EMPTY_PORTAL_URL_MESSAGE,
  NON_HTTPS_PORTAL_URL_MESSAGE,
  UNPARSEABLE_PORTAL_URL_MESSAGE,
  validateAgentPortalUrl,
} from "./validateAgentPortalUrl";

describe("validateAgentPortalUrl", () => {
  test.each([
    ["the Azure Portal preset", "https://portal.azure.com", "https://portal.azure.com/"],
    ["the AWS Console preset", "https://console.aws.amazon.com", "https://console.aws.amazon.com/"],
    ["the WSO2 Identity Server Cloud preset", "https://console.asgardeo.io", "https://console.asgardeo.io/"],
    ["a public custom URL with a path", "https://github.com/orgs/wso2/settings", "https://github.com/orgs/wso2/settings"],
    ["a URL with spaces around it", "  https://portal.azure.com  ", "https://portal.azure.com/"],
    ["an IPv6 address", "https://[2606:4700::1111]", "https://[2606:4700::1111]/"],
  ])("accepts %s", (_, input, url) => {
    expect(validateAgentPortalUrl(input)).toEqual({ valid: true, url });
  });

  // Whether a host is approved -- an internal portal by name or address, or
  // one that isn't on the list at all -- is the server's decision, so the
  // form check lets these through and the server answers with its message.
  test.each([
    ["an internal portal by name", "https://jira.internal.wso2.com", "https://jira.internal.wso2.com/"],
    ["an internal portal by address", "https://10.20.30.40", "https://10.20.30.40/"],
    ["a host that may not be approved", "https://localhost:8000", "https://localhost:8000/"],
  ])("leaves %s to the server's approved list", (_, input, url) => {
    expect(validateAgentPortalUrl(input)).toEqual({ valid: true, url });
  });

  test.each([
    ["an empty box", ""],
    ["only spaces", "   "],
  ])("refuses %s with the existing message", (_, input) => {
    expect(validateAgentPortalUrl(input)).toEqual({ valid: false, message: EMPTY_PORTAL_URL_MESSAGE });
  });

  test.each([
    ["text that is not a URL", "not a url"],
    ["a host with no scheme", "portal.azure.com"],
  ])("refuses %s as unparseable", (_, input) => {
    expect(validateAgentPortalUrl(input)).toEqual({ valid: false, message: UNPARSEABLE_PORTAL_URL_MESSAGE });
  });

  test.each([
    ["plain http", "http://portal.azure.com"],
    ["file", "file:///etc/passwd"],
    ["javascript", "javascript:alert(1)"],
    ["data", "data:text/html,<h1>hi</h1>"],
    ["ftp", "ftp://example.com"],
    ["chrome", "chrome://settings"],
  ])("refuses the %s scheme", (_, input) => {
    expect(validateAgentPortalUrl(input)).toEqual({ valid: false, message: NON_HTTPS_PORTAL_URL_MESSAGE });
  });

  test.each([
    ["a username and password", "https://user:secret@portal.azure.com"],
    ["a username only", "https://user@portal.azure.com"],
  ])("refuses a URL with %s", (_, input) => {
    expect(validateAgentPortalUrl(input)).toEqual({ valid: false, message: CREDENTIALS_PORTAL_URL_MESSAGE });
  });
});
