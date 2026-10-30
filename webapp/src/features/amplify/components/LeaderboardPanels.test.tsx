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

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Leaderboard } from "../api/amplifyTypes";
import { TeamLeaderboardPanel } from "./LeaderboardPanels";

vi.mock("./PersonLink", () => ({ default: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));

function board(houseName?: string | null): Leaderboard {
  return {
    topN: 3,
    company: [],
    me: { employeeId: "e1", points: 10, rank: 1, pointsToNextRank: 0, pointsToTopN: 0, inTopN: true },
    myTeam: {
      teamName: "Digital Engineering",
      houseName,
      headcount: 2,
      activeCount: 1,
      entries: [{ employeeId: "e1", displayName: "Ada Lovelace", email: "ada@example.com", points: 10, teamRank: 1, companyRank: 1, isMe: true }],
    },
    teamStatus: "OK",
  };
}

describe("TeamLeaderboardPanel", () => {
  it("names the viewer's house above the table", () => {
    render(<TeamLeaderboardPanel board={board("Oak")} people={new Map()} />);
    expect(screen.getByText("Oak")).toBeTruthy();
    expect(screen.getByText(/House:/)).toBeTruthy();
  });

  it("leaves the house line off when the directory has none", () => {
    render(<TeamLeaderboardPanel board={board(null)} people={new Map()} />);
    expect(screen.queryByText(/House:/)).toBeNull();
  });
});
