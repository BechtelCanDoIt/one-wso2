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

import { beforeEach, describe, expect, it, vi } from "vitest";

const authedPost = vi.fn();
vi.mock("@api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@api/http")>()),
  authedPost: (...args: unknown[]) => authedPost(...args),
}));

const { startLinkedInConnect } = await import("./amplifyClient");
const { CONNECT_RETURN_TO_PATTERN, DEFAULT_RETURN_PATH } = await import("../components/shareFlow");

const sentBody = () => authedPost.mock.calls[0][2] as { returnTo?: string; pendingCampaignId?: string };

// startLinkedInConnect is the one door every returnTo leaves through, so it
// enforces the server's ConnectStart.returnTo pattern whoever the caller is.
describe("startLinkedInConnect returnTo", () => {
  beforeEach(() => {
    authedPost.mockReset().mockResolvedValue({ authorizationUrl: "https://www.linkedin.com/x", state: "s", expiresAt: "t" });
  });

  it("passes a clean path through unchanged", async () => {
    await startLinkedInConnect("token", { returnTo: "/amplify/leaderboard", pendingCampaignId: "c-1" });
    expect(sentBody()).toEqual({ returnTo: "/amplify/leaderboard", pendingCampaignId: "c-1" });
  });

  it.each([["/amplify/a b"], ["/amplify\\posts"], ["//evil.example"], ["/amplify/\tposts"], ["https://evil.example"]])(
    "replaces %j with the default Amplify page",
    async (raw) => {
      await startLinkedInConnect("token", { returnTo: raw, pendingCampaignId: "c-1" });
      expect(sentBody().returnTo).toBe(DEFAULT_RETURN_PATH);
      expect(sentBody().returnTo).toMatch(CONNECT_RETURN_TO_PATTERN);
      expect(sentBody().pendingCampaignId).toBe("c-1");
    },
  );

  it("leaves returnTo out when the caller left it out", async () => {
    await startLinkedInConnect("token", { pendingCampaignId: "c-1" });
    expect(sentBody()).not.toHaveProperty("returnTo");
  });
});
