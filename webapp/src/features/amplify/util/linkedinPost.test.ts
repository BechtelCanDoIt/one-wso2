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

import { describe, expect, it } from "vitest";
import { closesAtFromDateInput, linkedInPostUrl, postUrnFromUrl } from "./linkedinPost";

describe("postUrnFromUrl", () => {
  it("reads the feed form", () => {
    expect(postUrnFromUrl("https://www.linkedin.com/feed/update/urn:li:share:7123/")).toBe("urn:li:share:7123");
    expect(postUrnFromUrl("https://www.linkedin.com/feed/update/urn:li:activity:7514314521537110016")).toBe(
      "urn:li:activity:7514314521537110016",
    );
  });

  it("reads a URL-encoded feed form", () => {
    expect(postUrnFromUrl("https://www.linkedin.com/feed/update/urn%3Ali%3AugcPost%3A99/")).toBe("urn:li:ugcPost:99");
  });

  it("reads the copy-link form", () => {
    expect(postUrnFromUrl("https://www.linkedin.com/posts/wso2_ai-agents-activity-7380000000000000000-AbCd")).toBe(
      "urn:li:activity:7380000000000000000",
    );
  });

  it("refuses anything else", () => {
    expect(postUrnFromUrl("")).toBeNull();
    expect(postUrnFromUrl("https://example.com/posts/x-activity-1-y")).toBeNull();
    expect(postUrnFromUrl("https://www.linkedin.com/in/someone")).toBeNull();
    expect(postUrnFromUrl("%E0%A4%A")).toBeNull();
  });
});

describe("linkedInPostUrl", () => {
  it("prefers the stored URL", () => {
    expect(linkedInPostUrl("urn:li:share:1", "https://www.linkedin.com/posts/x")).toBe("https://www.linkedin.com/posts/x");
    expect(linkedInPostUrl("urn:li:share:1")).toBe("https://www.linkedin.com/feed/update/urn:li:share:1/");
  });
});

describe("closesAtFromDateInput", () => {
  it("ends the chosen day", () => {
    expect(closesAtFromDateInput("2026-11-17")).toBe("2026-11-17T23:59:59Z");
    expect(closesAtFromDateInput("")).toBeUndefined();
  });
});
