// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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


import { afterEach, describe, expect, it } from "vitest";
import {
  clearConnectResult,
  clearPendingShare,
  consumeConnectResult,
  DEFAULT_RETURN_PATH,
  describeOAuthError,
  HANDOFF_TTL_MS,
  loadPendingShare,
  safeReturnPath,
  saveConnectResult,
  savePendingShare,
} from "./shareFlow";

const share = {
  campaignId: "c-1",
  campaignTitle: "Launch",
  kind: "SHARE_COMMENTARY" as const,
  commentary: "Proud of this",
  returnTo: "/amplify/posts",
};

afterEach(() => {
  clearPendingShare();
  clearConnectResult();
});

describe("the pending share handoff", () => {
  it("round-trips through localStorage with a savedAt stamp", () => {
    savePendingShare(share, 1_000);
    expect(loadPendingShare(1_000 + 60_000)).toEqual({ ...share, savedAt: 1_000 });
  });

  it("ignores and clears a share older than the TTL", () => {
    savePendingShare(share, 1_000);
    expect(loadPendingShare(1_000 + HANDOFF_TTL_MS + 1)).toBeNull();
    // Cleared, not just hidden: a later read inside the window sees nothing.
    expect(loadPendingShare(1_000)).toBeNull();
  });

  it("ignores a legacy entry with no savedAt", () => {
    window.localStorage.setItem("amplify.pendingShare", JSON.stringify(share));
    expect(loadPendingShare()).toBeNull();
    expect(window.localStorage.getItem("amplify.pendingShare")).toBeNull();
  });

  it("ignores malformed JSON", () => {
    window.localStorage.setItem("amplify.pendingShare", "{not json");
    expect(loadPendingShare()).toBeNull();
  });
});

describe("the connect result signal", () => {
  it("is one-shot", () => {
    saveConnectResult({ status: "ok" }, 5_000);
    expect(consumeConnectResult(5_001)).toMatchObject({ status: "ok" });
    expect(consumeConnectResult(5_002)).toBeNull();
  });

  it("drops a stale result", () => {
    saveConnectResult({ status: "ok" }, 5_000);
    expect(consumeConnectResult(5_000 + HANDOFF_TTL_MS + 1)).toBeNull();
  });
});

describe("safeReturnPath", () => {
  it("accepts same-origin absolute paths", () => {
    expect(safeReturnPath("/amplify/posts")).toBe("/amplify/posts");
    expect(safeReturnPath("/amplify/team?q=a#x")).toBe("/amplify/team?q=a#x");
  });

  it.each([
    ["https://evil.example/phish"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["javascript:alert(1)"],
    ["amplify/posts"],
    ["/\t/evil.example"],
    [""],
    [undefined],
    [42],
  ])("falls back for %s", (raw) => {
    expect(safeReturnPath(raw)).toBe(DEFAULT_RETURN_PATH);
  });
});

describe("describeOAuthError", () => {
  it("maps known LinkedIn codes to fixed copy", () => {
    expect(describeOAuthError("user_cancelled_login")).toMatch(/cancelled/);
    expect(describeOAuthError("user_cancelled_authorize")).toMatch(/cancelled/);
    expect(describeOAuthError("access_denied")).toMatch(/didn't grant/);
  });

  it("never echoes an unknown code", () => {
    const text = describeOAuthError("<img src=x onerror=alert(1)>");
    expect(text).not.toContain("<img");
    expect(text).toMatch(/couldn't complete/);
  });

  it("explains a missing code", () => {
    expect(describeOAuthError(null)).toMatch(/authorization code/);
  });
});
