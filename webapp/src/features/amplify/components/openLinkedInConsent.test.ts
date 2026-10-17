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


import { describe, expect, it, vi } from "vitest";
import { openLinkedInConsent, POPUP_BLOCKED_MESSAGE } from "./openLinkedInConsent";

function fakeTab() {
  return {
    opener: {} as unknown,
    location: { href: "about:blank" },
    close: vi.fn(),
  };
}

describe("openLinkedInConsent", () => {
  it("reports a real block when the synchronous open returns null", async () => {
    const open = vi.fn(() => null);
    const getUrl = vi.fn(async () => "https://www.linkedin.com/oauth/v2/authorization?x=1");
    const outcome = await openLinkedInConsent(getUrl, { open });
    expect(outcome).toEqual({ status: "blocked" });
    // Blocked means stop: the backend is not asked for a state it would waste.
    expect(getUrl).not.toHaveBeenCalled();
    expect(POPUP_BLOCKED_MESSAGE).toMatch(/blocked/);
  });

  it("opens a blank tab inside the click, before any await, and without noopener", () => {
    const tab = fakeTab();
    const open = vi.fn(() => tab as unknown as Window);
    // Never resolves: proves the open does not wait for the URL.
    void openLinkedInConsent(() => new Promise<string>(() => {}), { open });
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("", "_blank");
  });

  it("cuts the opener and navigates the tab once the URL arrives", async () => {
    const tab = fakeTab();
    const open = vi.fn(() => tab as unknown as Window);
    const outcome = await openLinkedInConsent(async () => "https://www.linkedin.com/oauth/v2/authorization?state=s", {
      open,
    });
    expect(outcome).toEqual({ status: "opened" });
    expect(tab.opener).toBeNull();
    expect(tab.location.href).toBe("https://www.linkedin.com/oauth/v2/authorization?state=s");
    expect(tab.close).not.toHaveBeenCalled();
  });

  it("closes the blank tab and reports the error when the start call fails", async () => {
    const tab = fakeTab();
    const boom = new Error("503");
    const outcome = await openLinkedInConsent(
      async () => {
        throw boom;
      },
      { open: () => tab as unknown as Window },
    );
    expect(outcome).toEqual({ status: "failed", error: boom });
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(tab.location.href).toBe("about:blank");
  });

  it("refuses to navigate to a non-http(s) authorization URL", async () => {
    const tab = fakeTab();
    const outcome = await openLinkedInConsent(async () => "javascript:alert(1)", {
      open: () => tab as unknown as Window,
    });
    expect(outcome.status).toBe("failed");
    expect(tab.close).toHaveBeenCalled();
    expect(tab.location.href).toBe("about:blank");
  });
});
