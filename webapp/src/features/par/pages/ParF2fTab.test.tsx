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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ParCycle, ParRating } from "../api/types";

const query = <T,>(data: T) => ({ data, isLoading: false, isError: false, refetch: vi.fn() });
const FUTURE = "2999-12-31";
const PAST = "2000-01-01";

let cycle: ParCycle;
let rating: Partial<ParRating>;
const mutate = vi.fn();

vi.mock("@features/my/api/useMeProfile", () => ({
  useMeProfile: () => query({ userInfo: { workEmail: "me@example.com" } }),
}));
vi.mock("../api/useParData", () => ({
  useActiveParCycle: () => query([cycle]),
  useParRating: () => query(rating),
}));
vi.mock("../api/useParMutations", () => ({ useSaveParRating: () => ({ mutate, isPending: false }) }));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));

const { default: ParF2fTab } = await import("./ParF2fTab");

beforeEach(() => {
  cycle = { parCycleId: 2, parCycleStartDate: "2026-07-01", parF2FDeadline: FUTURE } as ParCycle;
  rating = { parRatingId: 1, parLeadStatus: "SHARED", parF2fStatus: "PENDING" };
  mutate.mockReset();
});

describe("ParF2fTab in Active cycle", () => {
  it("is the completed date and Mark as completed, with none of the older page's notes", () => {
    render(<ParF2fTab activeCycle />);
    expect(screen.getByText("F2F Completed Date:")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/deadline/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark as completed" }));
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("says it's available once the lead shares their review", () => {
    rating = { ...rating, parLeadStatus: "PENDING" };
    render(<ParF2fTab activeCycle />);
    expect(screen.getByText("Available once your lead shares their review.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as completed" })).not.toBeInTheDocument();
  });

  it("says when it was completed, and shows nothing once its deadline has passed", () => {
    rating = { ...rating, parF2fStatus: "COMPLETED", parF2fDate: "2026-12-14" };
    const { unmount } = render(<ParF2fTab activeCycle />);
    expect(screen.getByText("F2F completed on 14 Dec '26")).toBeInTheDocument();
    unmount();
    cycle = { ...cycle, parF2FDeadline: PAST };
    rating = { ...rating, parF2fStatus: "PENDING", parF2fDate: undefined };
    const { container } = render(<ParF2fTab activeCycle />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps its notes on the older cycles' F2F page", () => {
    rating = { ...rating, parLeadStatus: "PENDING" };
    render(<ParF2fTab />);
    expect(screen.getByText("Lead's feedback must be completed to update F2F status")).toBeInTheDocument();
  });
});
