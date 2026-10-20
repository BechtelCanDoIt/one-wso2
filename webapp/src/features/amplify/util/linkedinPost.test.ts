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
import { closesAtFromDateInput, isAllowedLink, linkedInPostUrl, originOf, postUrnFromUrl } from "./linkedinPost";

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

describe("post links stay on LinkedIn", () => {
  it("refuses a URN carried on another host", () => {
    expect(postUrnFromUrl("https://evil.example/?x=urn:li:share:1")).toBeNull();
    expect(postUrnFromUrl("https://www.linkedin.com.evil.example/feed/update/urn:li:share:1/")).toBeNull();
    expect(postUrnFromUrl("https://www.linkedin.com@evil.example/feed/update/urn:li:share:1/")).toBeNull();
    expect(postUrnFromUrl("http://www.linkedin.com/feed/update/urn:li:share:1/")).toBeNull();
    expect(postUrnFromUrl("javascript:alert('urn:li:share:1')")).toBeNull();
  });

  it("still takes a bare URN (registered without a link)", () => {
    expect(postUrnFromUrl("urn:li:share:7123")).toBe("urn:li:share:7123");
    expect(isAllowedLink("urn:li:share:7123")).toBe(false);
  });

  it("accepts the mock LinkedIn only where it's listed (dev and demos)", () => {
    const mock = "http://localhost:19091/feed/update/urn:li:share:7123/";
    expect(postUrnFromUrl(mock)).toBeNull();
    expect(postUrnFromUrl(mock, ["https://www.linkedin.com", "http://localhost:19091"])).toBe("urn:li:share:7123");
  });

  it("never renders a stored link from another host", () => {
    expect(linkedInPostUrl("urn:li:share:1", "https://evil.example/p")).toBe(
      "https://www.linkedin.com/feed/update/urn:li:share:1/",
    );
    expect(linkedInPostUrl("urn:li:share:1", "javascript:alert(1)")).toBe(
      "https://www.linkedin.com/feed/update/urn:li:share:1/",
    );
  });

  it("reads the origin of http(s) URLs only", () => {
    expect(originOf("https://WWW.LinkedIn.com/feed")).toBe("https://www.linkedin.com");
    expect(originOf("https://u:p@www.linkedin.com/")).toBeNull();
    expect(originOf("ftp://www.linkedin.com/")).toBeNull();
    expect(originOf("not a url")).toBeNull();
  });
});

