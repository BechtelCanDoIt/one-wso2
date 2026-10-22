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
import { fireEvent, render, screen, within } from "@testing-library/react";
import type {
  DashboardGlance,
  DashboardOperations,
  DashboardParticipation,
  DashboardCampaigns,
  DashboardScorecard,
  GroupBoard,
} from "../../api/amplifyTypes";
import { nextSort } from "../../util/dashboardFormat";
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
    expect(screen.getByText("187 / 0")).toBeTruthy();
    expect(screen.getByText("+23 vs previous 7 days")).toBeTruthy();
    expect(screen.getByText("Retrying · attempt 3")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Novera" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Reposts" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Reposts/Comments" })).toBeTruthy();
    expect(screen.getByText("Updated 2:45 PM LK | Updated 5:15 AM EDT | Updated 9:15 AM UTC")).toBeTruthy();
    expect(screen.getByText(/680 employees have never connected/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /remind|retry/i })).toBeNull();
  });

  it("switches the points tile between week, month and year, and splits last week's reposts", () => {
    const withPeriods: DashboardOperations = {
      ...operations,
      kpis: { ...operations.kpis, reposts7d: 8, repostsPrev7d: 5, reposts7dWithCommentary: 2, pointsThisWeek: 40, pointsThisMonth: 1840, pointsThisYear: 9000 },
    };
    render(<OperationsBoard data={withPeriods} />);
    const tile = screen.getByRole("region", { name: "Points awarded" });
    expect(within(tile).getByText("40")).toBeTruthy();
    expect(within(tile).getByRole("button", { name: "Week" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(tile).getByRole("button", { name: "Month" }));
    expect(within(tile).getByText("1,840")).toBeTruthy();
    fireEvent.click(within(tile).getByRole("button", { name: "Year" }));
    expect(within(tile).getByText("9,000")).toBeTruthy();
    const reposts = screen.getByRole("region", { name: "Reposts / Reposts with Comments" });
    expect(within(reposts).getByText("6 / 2")).toBeTruthy();
    expect(within(reposts).getByText(/\+3 vs previous 7 days/)).toBeTruthy();
  });

  it("treats a missing split or period as 0", () => {
    render(<OperationsBoard data={operations} />);
    const tile = screen.getByRole("region", { name: "Points awarded" });
    expect(within(tile).getByText("0")).toBeTruthy();
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
    expect(screen.getByText("Novera: Sent")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Campaign detail" })).toBeTruthy();
    expect(screen.getByText("Showing the campaign with the most reposts. Click any campaign on the left to change it.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Hiring/ }));
    expect(onSelect).toHaveBeenCalledWith("c2");
  });

  it("says when the campaign was picked, and splits each category into plain and commented reposts", () => {
    render(
      <PostPerformanceBoard
        data={{ ...campaigns, byCategory: [{ code: "PRODUCT", label: "Product", reposts: 45, repostsWithCommentary: 12 }, { code: "EVENT", label: "Event", reposts: 10 }] }}
        onSelect={() => undefined}
        picked
      />,
    );
    expect(screen.getByText("Showing the campaign you picked.")).toBeTruthy();
    expect(screen.getByText("45 (12 with comments)")).toBeTruthy();
    expect(screen.getByText("10 (0 with comments)")).toBeTruthy();
    expect(screen.getByText("Reposts include reposts with comments.")).toBeTruthy();
  });

  it("asks for a pick when no post is selected", () => {
    render(<PostPerformanceBoard data={{ ...campaigns, selected: null }} onSelect={() => undefined} />);
    expect(screen.getByText(/Pick a campaign on the left/)).toBeTruthy();
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

  it("shows one pill per BU with exactly one selected, and no All BUs pill", () => {
    const onBu = vi.fn();
    render(<TeamTable board={board} bus={["Engineering", "Sales"]} bu="Engineering" onBu={onBu} sort="rank" dir="asc" onSort={vi.fn()} />);
    expect(screen.queryByText("All BUs")).toBeNull();
    expect(screen.getByRole("button", { name: "Engineering" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Sales" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Digital Engineering")).toBeTruthy();
    expect(screen.getByText(/2 people with 20 points aren't placed/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sales" }));
    expect(onBu).toHaveBeenCalledWith("Sales");
  });

  it("makes every sortable header a button with aria-sort and an arrow on the active one", () => {
    const onSort = vi.fn();
    render(<TeamTable board={board} bus={["Engineering"]} bu="Engineering" onBu={vi.fn()} sort="points" dir="desc" onSort={onSort} />);
    const points = screen.getByRole("columnheader", { name: /Points/ });
    expect(points.getAttribute("aria-sort")).toBe("descending");
    expect(points.textContent).toContain("↓");
    expect(screen.getByRole("columnheader", { name: /Team/ }).getAttribute("aria-sort")).toBe("none");
    for (const name of ["#", "Team", "Points", "Participants", "Headcount", "Participation"]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));
    }
    expect(onSort.mock.calls.map((c) => c[0])).toEqual(["rank", "name", "points", "participants", "headcount", "participation"]);
  });

  it("starts numeric columns largest-first, names A to Z, and toggles the active one", () => {
    expect(nextSort({ sort: "rank", dir: "asc" }, "points")).toEqual({ sort: "points", dir: "desc" });
    expect(nextSort({ sort: "rank", dir: "asc" }, "participation")).toEqual({ sort: "participation", dir: "desc" });
    expect(nextSort({ sort: "points", dir: "desc" }, "name")).toEqual({ sort: "name", dir: "asc" });
    expect(nextSort({ sort: "name", dir: "asc" }, "name")).toEqual({ sort: "name", dir: "desc" });
    expect(nextSort({ sort: "points", dir: "desc" }, "points")).toEqual({ sort: "points", dir: "asc" });
    expect(nextSort({ sort: "points", dir: "desc" }, "rank")).toEqual({ sort: "rank", dir: "asc" });
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

  it("shows medal pills for 1st, 2nd and 3rd, and plain numbers after", () => {
    render(
      <GlanceBoard
        data={glance}
        people={[
          { employeeId: "a", displayName: "A", email: "a@wso2.com", points: 30, rank: 1 },
          { employeeId: "b", displayName: "B", email: "b@wso2.com", points: 20, rank: 2 },
          { employeeId: "c", displayName: "C", email: "c@wso2.com", points: 10, rank: 3 },
        ]}
        teams={[{ rank: 4, key: "k", name: "Fourth", points: 1, participants: 1, headcount: 2, participationRate: 0.5 }]}
      />,
    );
    expect(screen.getByRole("img", { name: "1st place" }).textContent).toBe("1");
    expect(screen.getByRole("img", { name: "2nd place" }).textContent).toBe("2");
    expect(screen.getByRole("img", { name: "3rd place" }).textContent).toBe("3");
    expect(screen.getByRole("img", { name: "1st place" }).querySelector("svg")).not.toBeNull();
    const widths = ["1st place", "2nd place", "3rd place"].map((n) => getComputedStyle(screen.getByRole("img", { name: n })).width);
    expect(new Set(widths).size).toBe(1);
    expect(widths[0]).toBe("36px");
    expect(screen.getByRole("img", { name: "2nd place" }).querySelector("svg")).toBeNull();
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("shows the directory name for a person, never the id or the API's fallback", () => {
    render(
      <GlanceBoard
        data={glance}
        people={[{ employeeId: "emp-7f3a", displayName: "Person emp-7f3a", email: "J@WSO2.com", points: 120, rank: 1 }]}
        teams={[]}
        directory={new Map([["j@wso2.com", { name: "Jane Doe", photoUrl: null }]])}
      />,
    );
    expect(screen.getByText("Jane Doe")).toBeTruthy();
    expect(screen.queryByText(/emp-7f3a/)).toBeNull();
  });

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

  it("gives every measure a progress bar with words, in the status colour's place as well as beside the chip", () => {
    render(<ScorecardBoard data={card} />);
    const bars = screen.getAllByRole("progressbar");
    expect(bars).toHaveLength(2);
    expect(bars[0].getAttribute("aria-valuetext")).toBe("18% of 25% target");
    expect(bars[0].getAttribute("aria-valuemin")).toBe("0");
    expect(bars[0].getAttribute("aria-valuemax")).toBe("100");
    expect(bars[0].getAttribute("aria-valuenow")).toBe("18");
    expect(bars[1].getAttribute("aria-valuetext")).toBe("2.7% against a 5% ceiling");
    expect(screen.getByText("Watch", { selector: "span" })).toBeTruthy();
    expect(screen.getByText("Target 25%")).toBeTruthy();
    expect(screen.getByText("Ceiling 5%")).toBeTruthy();
    expect(screen.getByText("Bar = current value. Line = target (or ceiling for expired).")).toBeTruthy();
  });

  it("says so with no measures", () => {
    render(<ScorecardBoard data={{ ...card, measures: [] }} />);
    expect(screen.getByText(/No measures yet/)).toBeTruthy();
  });
});
