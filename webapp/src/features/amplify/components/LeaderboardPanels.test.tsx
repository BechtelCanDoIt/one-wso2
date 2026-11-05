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

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Leaderboard, TopBoard } from "../api/amplifyTypes";
import { TeamLeaderboardPanel, TopAmplifiersPanel } from "./LeaderboardPanels";

vi.mock("./PersonLink", () => ({ default: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));

function board(): Leaderboard {
  return {
    topN: 3,
    company: [],
    me: { employeeId: "e1", points: 10, rank: 1, pointsToNextRank: 0, pointsToTopN: 0, inTopN: true },
    myTeam: {
      teamName: "Digital Engineering",
      headcount: 2,
      activeCount: 2,
      entries: [
        { employeeId: "e1", displayName: "Ada Lovelace", email: "ada@example.com", points: 10, teamRank: 1, companyRank: 1, houseName: "Oak", isMe: true },
        { employeeId: "e2", displayName: "Grace Hopper", email: "grace@example.com", points: 5, teamRank: 2, companyRank: 2, houseName: null, isMe: false },
      ],
    },
    teamStatus: "OK",
  };
}

describe("TeamLeaderboardPanel", () => {
  it("shows each member's house, and a dash for a member with none", () => {
    render(<TeamLeaderboardPanel board={board()} people={new Map()} />);
    expect(screen.getByRole("columnheader", { name: "House" })).toBeTruthy();
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Oak")).toBeTruthy();
    expect(within(rows[2]).getByText("—")).toBeTruthy();
  });

  it("shows a member with no standing row as plain text, with no person link", () => {
    const b = board();
    b.myTeam!.entries.push({
      employeeId: null,
      displayName: "Linus Torvalds",
      email: "linus@example.com",
      points: 0,
      teamRank: 3,
      companyRank: null,
      houseName: null,
      isMe: false,
    });
    render(<TeamLeaderboardPanel board={b} people={new Map()} />);
    const rows = screen.getAllByRole("row");
    expect(within(rows[3]).getByText("Linus Torvalds")).toBeTruthy();
    expect(within(rows[3]).queryByRole("button")).toBeNull();
    expect(within(rows[3]).getByText("0 pts")).toBeTruthy();
  });

  it("offers a link to the full team page only when a handler is given", () => {
    const onViewAll = vi.fn();
    const { unmount } = render(<TeamLeaderboardPanel board={board()} people={new Map()} />);
    expect(screen.queryByRole("button", { name: "View full team" })).toBeNull();
    unmount();
    render(<TeamLeaderboardPanel board={board()} people={new Map()} onViewAll={onViewAll} />);
    fireEvent.click(screen.getByRole("button", { name: "View full team" }));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it("keeps the caller's row when the team roster is unavailable", () => {
    const b = board();
    b.teamStatus = "UNAVAILABLE";
    b.myTeam!.entries = [b.myTeam!.entries[0]];
    render(<TeamLeaderboardPanel board={b} people={new Map()} />);
    expect(screen.getByText(/Only you are shown/)).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });
});

describe("TopAmplifiersPanel", () => {
  function topBoard(minPoints?: number | null): TopBoard {
    return {
      period: "MONTH",
      minPoints,
      topN: 3,
      generatedAt: "2026-11-04T00:00:00Z",
      company: [
        { employeeId: "e1", displayName: "Ada Lovelace", email: "ada@example.com", points: 120, rank: 1 },
        { employeeId: "e2", displayName: "Grace Hopper", email: "grace@example.com", points: 110, rank: 2 },
        { employeeId: "e3", displayName: "Alan Turing", email: "alan@example.com", points: 90, rank: 3 },
      ],
      me: { employeeId: "e1", points: 120, rank: 1, pointsToNextRank: 0, pointsToTopN: 0, inTopN: true },
    };
  }

  it("shows the 100 minimum rule when the API sends none", () => {
    render(<TopAmplifiersPanel board={topBoard(null)} people={new Map()} />);
    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("Minimum to qualify.")).toBeTruthy();
    expect(screen.getByText("Top 3")).toBeTruthy();
    // The podium still holds three people, including one under the minimum.
    expect(screen.getByText("Alan Turing")).toBeTruthy();
  });

  it("follows the API's minimum when it sends one", () => {
    render(<TopAmplifiersPanel board={topBoard(250)} people={new Map()} />);
    expect(screen.getByText("250")).toBeTruthy();
  });

  it("shows the rule only for the monthly board", () => {
    const allTime = { ...topBoard(null), period: "ALL" as const };
    render(<TopAmplifiersPanel board={allTime} people={new Map()} />);
    expect(screen.queryByText("Minimum to qualify.")).toBeNull();
    expect(screen.queryByText("Top 3")).toBeNull();
  });
});
