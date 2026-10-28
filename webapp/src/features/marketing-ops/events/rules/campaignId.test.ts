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

// The campaign ID read out of the submission's Salesforce URL and stamped on every row.
// Same cases as the Marketing Ops backend's test_events_campaign_id.py, so the grid
// here and the server's CSV cannot disagree.

import { describe, expect, it } from "vitest";
import { campaignIdFrom, derive } from "./validate";
import type { EventsConfig } from "./schema";

const ID18 = "701Ql00000AbCdEIAV";

describe("campaignIdFrom", () => {
  it.each([
    [`https://wso2.lightning.force.com/lightning/r/Campaign/${ID18}/view`],
    [`https://wso2.my.salesforce.com/${ID18}`],
    [`  ${ID18} `],
    // 15 characters: capitals at 3 | none | 0,2,4 give the suffix I, A, V.
    ["https://wso2.my.salesforce.com/701Ql00000AbCdE"],
  ])("reads the campaign ID from %s", (text) => {
    expect(campaignIdFrom(text)).toBe(ID18);
  });

  it.each([
    // 001 is an Account, not a Campaign.
    ["https://wso2.lightning.force.com/lightning/r/Account/001Ql00000AbCdEIAV/view"],
    ["x701Ql00000AbCdEIAVx"],
    [""],
  ])("finds nothing in %s", (text) => {
    expect(campaignIdFrom(text)).toBe("");
  });
});

describe("derive", () => {
  const config: EventsConfig = {
    statuses: [{ name: "Booth", score: 5, enabled: true }],
    fields: { Booth: [] },
  };

  it("stamps the campaign ID on the row", () => {
    const row = derive({ email: "a@b.co" }, "Booth",
      { name: "Summit", date: "2026-08-13", campaignUrl: ID18 }, config);
    expect(row.campaign_id).toBe(ID18);
  });

  it("clears a stale ID when the URL no longer has one", () => {
    const row = derive({ email: "a@b.co", campaign_id: ID18 }, "Booth",
      { name: "Summit", date: "2026-08-13", campaignUrl: "" }, config);
    expect(row.campaign_id).toBe("");
  });
});
