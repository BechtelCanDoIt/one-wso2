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


import { describe, expect, it } from "vitest";
import type { Setting } from "../api/amplifyTypes";
import {
  campaignFormError,
  defaultClosesAt,
  fromLocalInput,
  mergeSettingDrafts,
  parseTags,
  pointRuleBody,
  SETTING_FIELDS,
  toLocalInput,
  toSettingValue,
  type CampaignFormValues,
} from "./amplifyForms";

const field = (key: string) => SETTING_FIELDS.find((f) => f.key === key)!;

describe("admin settings value typing", () => {
  it("edits exactly the contract's real keys", () => {
    expect(SETTING_FIELDS.map((f) => f.key)).toEqual([
      "leaderboard.top_n",
      "run.schedule",
      "connection.reminder_days",
      "campaign.default_window_days",
    ]);
  });

  it("sends ints as JSON numbers, never as strings", () => {
    const parsed = toSettingValue(field("leaderboard.top_n"), " 5 ");
    expect(parsed).toEqual({ ok: true, value: 5 });
    expect(JSON.stringify({ value: parsed.ok && parsed.value })).toBe('{"value":5}');
  });

  it("refuses blank, fractional, non-numeric and out-of-range ints", () => {
    const topN = field("leaderboard.top_n");
    expect(toSettingValue(topN, "").ok).toBe(false);
    expect(toSettingValue(topN, "2.5").ok).toBe(false);
    expect(toSettingValue(topN, "ten").ok).toBe(false);
    expect(toSettingValue(topN, "0").ok).toBe(false);
    expect(toSettingValue(topN, "51").ok).toBe(false);
    expect(toSettingValue(field("connection.reminder_days"), "31").ok).toBe(false);
    expect(toSettingValue(field("campaign.default_window_days"), "365")).toEqual({ ok: true, value: 365 });
  });

  it("sends booleans as JSON booleans and schedules as trimmed strings", () => {
    const flag = { key: "run.enabled", label: "Run enabled", helper: "", kind: "boolean" as const };
    expect(toSettingValue(flag, "true")).toEqual({ ok: true, value: true });
    expect(toSettingValue(flag, "false")).toEqual({ ok: true, value: false });
    expect(toSettingValue(flag, "yes").ok).toBe(false);
    expect(toSettingValue(field("run.schedule"), " @every 30m ")).toEqual({ ok: true, value: "@every 30m" });
    expect(toSettingValue(field("run.schedule"), "  ").ok).toBe(false);
  });

  it("keeps an in-progress edit through a background refetch", () => {
    const at = "2026-10-17T00:00:00Z";
    const before: Setting[] = [
      { key: "leaderboard.top_n", value: 3, version: 1, updatedBy: "a", updatedAt: at },
      { key: "run.schedule", value: "@every 5m", version: 1, updatedBy: "a", updatedAt: at },
    ];
    const after: Setting[] = [
      { key: "leaderboard.top_n", value: 3, version: 1, updatedBy: "a", updatedAt: at },
      { key: "run.schedule", value: "@every 10m", version: 2, updatedBy: "b", updatedAt: at },
    ];
    // The reader typed 7 into top N; someone else changed the schedule.
    const merged = mergeSettingDrafts({ "leaderboard.top_n": "7", "run.schedule": "@every 5m" }, before, after);
    expect(merged).toEqual({ "leaderboard.top_n": "7", "run.schedule": "@every 10m" });
  });

  it("seeds every key from the server on the first read", () => {
    const at = "2026-10-17T00:00:00Z";
    const first: Setting[] = [{ key: "leaderboard.top_n", value: 3, version: 1, updatedBy: "a", updatedAt: at }];
    expect(mergeSettingDrafts({}, undefined, first)).toEqual({ "leaderboard.top_n": "3" });
  });
});

describe("point rule body", () => {
  const now = new Date(2026, 9, 17, 12, 0);

  it("omits effectiveFrom when blank, so the server starts it now", () => {
    expect(pointRuleBody("REPOST", "10", "", now)).toEqual({ ok: true, body: { action: "REPOST", points: 10 } });
  });

  it("allows 0 points (the contract minimum) and refuses fractions, negatives and > 10000", () => {
    expect(pointRuleBody("REPOST", "0", "", now).ok).toBe(true);
    expect(pointRuleBody("REPOST", "1.5", "", now).ok).toBe(false);
    expect(pointRuleBody("REPOST", "-1", "", now).ok).toBe(false);
    expect(pointRuleBody("REPOST", "10001", "", now).ok).toBe(false);
    expect(pointRuleBody("REPOST", "", "", now).ok).toBe(false);
  });

  it("refuses a start in the past (RULE_BACKDATED) and sends a future one as ISO", () => {
    expect(pointRuleBody("SHARE", "5", "2026-10-17T09:00", now).ok).toBe(false);
    const future = pointRuleBody("SHARE", "5", "2026-10-18T09:00", now);
    expect(future.ok && future.body.effectiveFrom).toBe(new Date(2026, 9, 18, 9, 0).toISOString());
  });
});

describe("campaign form", () => {
  it("defaults the close to open + 30 days", () => {
    expect(defaultClosesAt("2026-10-17T09:30")).toBe("2026-11-16T09:30");
    // Across a month and year end.
    expect(defaultClosesAt("2026-12-15T00:00")).toBe("2027-01-14T00:00");
    expect(defaultClosesAt("")).toBe("");
  });

  it("round-trips datetime-local values through ISO", () => {
    const local = "2026-10-17T09:30";
    expect(toLocalInput(fromLocalInput(local))).toBe(local);
    expect(fromLocalInput("")).toBeUndefined();
    expect(toLocalInput(null)).toBe("");
  });

  it("parses tags the way the backend stores them", () => {
    expect(parseTags(" AI, cloud ,ai,, Integration ")).toEqual(["ai", "cloud", "integration"]);
  });

  const valid: CampaignFormValues = {
    resourceUrn: "urn:li:share:7123",
    ownerUrn: "urn:li:organization:1477",
    resourceUrl: "",
    title: "Launch",
    summary: "",
    imageUrl: "",
    categoryCode: "PRODUCT",
    tags: "",
    opensAt: "2026-10-17T09:00",
    closesAt: "2026-11-16T09:00",
  };

  it("accepts a complete draft", () => {
    expect(campaignFormError(valid, false)).toBeNull();
  });

  it("requires the URNs on create but not on edit", () => {
    expect(campaignFormError({ ...valid, resourceUrn: " " }, false)).toMatch(/resource URN/);
    expect(campaignFormError({ ...valid, ownerUrn: "" }, false)).toMatch(/owner URN/);
    expect(campaignFormError({ ...valid, resourceUrn: "", ownerUrn: "" }, true)).toBeNull();
  });

  it("refuses non-https images and a window that closes before it opens", () => {
    expect(campaignFormError({ ...valid, imageUrl: "http://x/y.png" }, false)).toMatch(/https/);
    expect(campaignFormError({ ...valid, imageUrl: "javascript:alert(1)" }, false)).toMatch(/https/);
    expect(campaignFormError({ ...valid, closesAt: "2026-10-16T09:00" }, false)).toMatch(/close after/);
  });
});
