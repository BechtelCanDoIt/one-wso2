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

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type {
  DashboardGlance,
  DashboardOperations,
  DashboardParticipation,
  DashboardCampaigns,
  DashboardScorecard,
  GroupBoard,
} from "../../api/amplifyTypes";
import { GlanceBoard } from "./GlanceBoard";
import { OperationsBoard } from "./OperationsBoard";
import { Funnel, TeamTable } from "./ParticipationBoard";
import { PostPerformanceBoard } from "./PostPerformanceBoard";
import { ScorecardBoard } from "./ScorecardBoard";

const operations: DashboardOperations = {
  asOf: "2026-10-22T09:15:00Z",
  headcount: 830,
  kpis: {
    campaignsLive: 6,
    campaignsLivePriority: 2,
    campaignsClosingWithin7Days: 1,
    reposts7d: 187,
    repostsPrev7d: 164,
    peopleConnected: 150,
    connectionsExpired: 4,
    pointsThisMonth: 1840,
    peopleWithPoints: 128,
  },
  campaigns: [
    {
      campaignId: "c1",
      title: "WSO2 at KubeCon",
      categoryCode: "EVENT",
      categoryLabel: "Event",
      isPriority: true,
      opensAt: "2026-10-20T00:00:00Z",
      closesAt: "2026-11-19T00:00:00Z",
      reposts: 48,
      announcement: { status: "QUEUED", attempts: 3 },
    },
  ],
  shareHealth: { windowDays: 7, published: 187, queued: 2, failed: 5, failedByReason: { NEEDS_RECONNECT: 4, PROVIDER_REJECTED: 1 } },
  connections: { active: 140, expiring: 6, expired: 4, revoked: 0, neverConnected: 680 },
};

describe("OperationsBoard", () => {
  it("shows the API's numbers and the retry the worker is on, with no reminder or retry buttons", () => {
    render(<OperationsBoard data={operations} />);
    expect(screen.getByText("187")).toBeTruthy();
    expect(screen.getByText("+23 vs previous 7 days")).toBeTruthy();
    expect(screen.getByText("Retrying · attempt 3")).toBeTruthy();
    expect(screen.getByText(/680 employees have never connected/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /remind|retry/i })).toBeNull();
  });

  it("says so when there are no posts", () => {
    render(<OperationsBoard data={{ ...operations, campaigns: [] }} />);
    expect(screen.getByText(/No posts are live/)).toBeTruthy();
  });
});

const campaigns: DashboardCampaigns = {
  asOf: "2026-10-22T09:15:00Z",
  windowDays: 30,
  campaigns: [
    { campaignId: "c1", title: "Launch", categoryCode: "PRODUCT", categoryLabel: "Product", isPriority: true, opensAt: "2026-10-19T00:00:00Z", closesAt: "2026-11-18T00:00:00Z", reposts: 112 },
    { campaignId: "c2", title: "Hiring", categoryCode: "CAREERS", categoryLabel: "Careers", isPriority: false, opensAt: "2026-10-21T00:00:00Z", closesAt: "2026-11-20T00:00:00Z", reposts: 22 },
  ],
  selected: {
    campaignId: "c1",
    title: "Launch",
    categoryCode: "PRODUCT",
    categoryLabel: "Product",
    isPriority: true,
    opensAt: "2026-10-19T00:00:00Z",
    closesAt: "2026-11-18T00:00:00Z",
    reposts: 112,
    shareOfConnected: 0.747,
    first24Hours: 61,
    announcement: { status: "SENT" },
    byDay: [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, reposts: 10 * day })),
  },
  byCategory: [{ code: "PRODUCT", label: "Product", reposts: 186 }],
};

describe("PostPerformanceBoard", () => {
  it("shows the selected post and reloads when another post is clicked", () => {
    const onSelect = vi.fn();
    render(<PostPerformanceBoard data={campaigns} onSelect={onSelect} />);
    expect(screen.getByText("75%")).toBeTruthy();
    expect(screen.getByText("Chat card: Sent")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Hiring/ }));
    expect(onSelect).toHaveBeenCalledWith("c2");
  });

  it("asks for a pick when no post is selected", () => {
    render(<PostPerformanceBoard data={{ ...campaigns, selected: null }} onSelect={() => undefined} />);
    expect(screen.getByText(/Pick a post/)).toBeTruthy();
  });
});

describe("Participation", () => {
  const funnel: DashboardParticipation = {
    asOf: "2026-10-22T09:15:00Z",
    funnel: { employees: 830, connected: 150, reposted: 128, active30Days: 104, expired: 4 },
  };
  const board: GroupBoard = {
    period: "ALL",
    by: "TEAM",
    asOf: "2026-10-22T09:15:00Z",
    totals: { headcount: 95, participants: 30, points: 412 },
    entries: [
      { rank: 1, key: "Eng/Digital", name: "Digital Engineering", businessUnit: "Engineering", points: 412, participants: 30, headcount: 95, participationRate: 0.316 },
    ],
    unassigned: { participants: 2, points: 20 },
  };

  it("shows the funnel with expired connections and never-connected employees", () => {
    render(<Funnel data={funnel} />);
    expect(screen.getByText("128 · 85% of connected")).toBeTruthy();
    expect(screen.getByText(/4 connections have expired\./)).toBeTruthy();
    expect(screen.getByText(/680 employees have never connected/)).toBeTruthy();
  });

  it("lists every team and filters by BU", () => {
    const onBu = vi.fn();
    render(<TeamTable board={board} bus={["Engineering", "Sales"]} bu={undefined} onBu={onBu} />);
    expect(screen.getByText("Digital Engineering")).toBeTruthy();
    expect(screen.getByText("30 of 95")).toBeTruthy();
    expect(screen.getByText(/2 people with 20 points aren't placed/)).toBeTruthy();
    fireEvent.click(screen.getByText("Sales"));
    expect(onBu).toHaveBeenCalledWith("Sales");
  });
});

describe("GlanceBoard", () => {
  const glance: DashboardGlance = {
    asOf: "2026-10-22T09:15:00Z",
    month: "2026-10",
    reposts: { thisMonth: 612, previousMonth: 443 },
    weekly: [
      { weekStart: "2026-09-01", reposts: 21 },
      { weekStart: "2026-09-08", reposts: 187 },
    ],
    participants: 128,
    headcount: 830,
    campaignsLive: 6,
    campaignsReachingTarget: { reached: 4, live: 6, thresholdPercent: 25 },
    shareSuccess: { published: 187, attempts: 192 },
    bestCampaign: { campaignId: "c1", title: "Launch", categoryLabel: "Product", isPriority: true, reposts: 112 },
  };

  it("shows the month, top people and top teams from the API data", () => {
    render(
      <GlanceBoard
        data={glance}
        people={[{ employeeId: "e1", displayName: "Jane Doe", email: "j@wso2.com", points: 120, rank: 1 }]}
        teams={[{ rank: 1, key: "k", name: "Marketing", points: 366, participants: 22, headcount: 30, participationRate: 0.73 }]}
      />,
    );
    expect(screen.getByText("612")).toBeTruthy();
    expect(screen.getByText(/\+38% on last month/)).toBeTruthy();
    expect(screen.getByText("Jane Doe")).toBeTruthy();
    expect(screen.getByText("Marketing")).toBeTruthy();
    expect(screen.getByText("97%")).toBeTruthy();
  });

  it("says so with no best post, people or teams", () => {
    render(<GlanceBoard data={{ ...glance, bestCampaign: null }} people={[]} teams={[]} />);
    expect(screen.getByText(/No reposts this month yet/)).toBeTruthy();
    expect(screen.getByText(/No points yet/)).toBeTruthy();
    expect(screen.getByText(/No teams to show/)).toBeTruthy();
  });
});

describe("ScorecardBoard", () => {
  const card: DashboardScorecard = {
    asOf: "2026-10-22T09:15:00Z",
    measures: [
      { key: "connected", label: "Employees connected", unit: "PERCENT", value: 18, numerator: 150, denominator: 830, target: 25, comparison: "AT_LEAST", status: "WATCH" },
      { key: "expired", label: "Connections expired", unit: "PERCENT", value: 2.7, numerator: 4, denominator: 150, target: 5, comparison: "AT_MOST", status: "ON_TRACK" },
    ],
  };

  it("renders value, target and the API's status, with no Novera box", () => {
    render(<ScorecardBoard data={card} />);
    expect(screen.getByText("At least 25%")).toBeTruthy();
    expect(screen.getByText("At most 5%")).toBeTruthy();
    expect(screen.getByText("Watch", { selector: "span" })).toBeTruthy();
    expect(screen.getByText("1 on track")).toBeTruthy();
    expect(screen.queryByText(/novera/i)).toBeNull();
  });

  it("says so with no measures", () => {
    render(<ScorecardBoard data={{ ...card, measures: [] }} />);
    expect(screen.getByText(/No measures yet/)).toBeTruthy();
  });
});
