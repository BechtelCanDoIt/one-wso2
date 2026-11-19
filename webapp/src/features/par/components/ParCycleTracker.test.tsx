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
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import type { Par360Reviewer, ParCycle, ParRating } from "../api/types";
import type { HomeStepKey } from "../util/parHome";

const query = <T,>(data: T) => ({ data, isLoading: false, isError: false, refetch: vi.fn() });

let rating: Partial<ParRating>;
let reviewers: Partial<Par360Reviewer>[];

vi.mock("../api/useParData", () => ({ useParRating: () => query(rating) }));
vi.mock("../api/usePar360", () => ({
  useReviewers: () => query(reviewers),
  useReviewRequests: () => query([]),
  useParticipants: () => query([{ workEmail: "hannah@example.com", employeeName: "Hannah" }]),
}));
vi.mock("../api/useSelfReview", () => ({ useSelfReview: () => query(undefined) }));
vi.mock("../api/useLeadership360", () => ({
  cycleSurvey: () => undefined,
  useLeadership360Surveys: () => query([]),
  useLeadership360Results: () => query([]),
}));

const { default: ParCycleTracker } = await import("./ParCycleTracker");

const FUTURE = "2999-12-31";
const cycle = {
  parCycleId: 2,
  parEmployeeDeadline: FUTURE,
  parThreeSixtyRatingDeadline: FUTURE,
  parLeadDeadline: FUTURE,
  parF2FDeadline: FUTURE,
} as ParCycle;

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function show(selected: HomeStepKey = "self-review") {
  render(
    <MemoryRouter initialEntries={[`/me/performance/cycle/${selected}`]}>
      <ParCycleTracker cycle={cycle} workEmail="me@example.com" selected={selected} />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const step = (label: string) => screen.getByText(label).closest("li")!;

beforeEach(() => {
  rating = {
    parEmployeeStatus: "DRAFT",
    parLeadStatus: "PENDING",
    parF2fStatus: "PENDING",
    parLeadEmail: "hannah@example.com",
  };
  reviewers = [];
});

describe("ParCycleTracker", () => {
  it("names the lead on the steps that are theirs, and when the face-to-face opens, with no dates on the steps", () => {
    show();
    expect(step("Lead review")).toHaveTextContent("Hannah reviews after you share");
    expect(step("Lead review")).not.toHaveTextContent("Expected by");
    expect(step("Face-to-face")).toHaveTextContent("Opens after Hannah shares");
    expect(step("Face-to-face")).not.toHaveTextContent("Due");
  });

  it("says in one line what happens next in the open step, its date and the days left", () => {
    show();
    expect(screen.getByText("Hannah sees it once you share it.")).toBeInTheDocument();
    expect(screen.getByText("Due 31 Dec '99")).toBeInTheDocument();
    expect(screen.getByText(/days left/)).toBeInTheDocument();
    cleanup();
    show("360");
    expect(screen.getByText(/Ask at least 3 people/)).toBeInTheDocument();
    expect(screen.queryByText("Hannah sees it once you share it.")).not.toBeInTheDocument();
  });

  it("gives someone else's deadline as a date only, and none once it's done", () => {
    show("lead-review");
    expect(screen.getByText("Nothing to do here until you share your self-review.")).toBeInTheDocument();
    expect(screen.getByText("Expected by 31 Dec '99")).toBeInTheDocument();
    expect(screen.queryByText(/days left/)).not.toBeInTheDocument();
    cleanup();
    rating = { ...rating, parEmployeeStatus: "SHARED", parLeadStatus: "SHARED" };
    show("lead-review");
    expect(screen.getByText("Your rating and feedback are here, with your PAR's PDF.")).toBeInTheDocument();
    expect(screen.queryByText(/Expected by/)).not.toBeInTheDocument();
  });

  it("outlines the open step, and the whole box of a step opens its part", async () => {
    const user = userEvent.setup();
    show();
    expect(step("Self-review").querySelector("[aria-current='page']")).not.toBeNull();
    await user.click(step("360° feedback").querySelector("button")!);
    expect(screen.getByTestId("where")).toHaveTextContent("/me/performance/cycle/360");
  });

  it("says the minimum is met while more 360° feedback can still come in", () => {
    reviewers = ["SHARED", "SHARED", "SHARED", "PENDING"].map((reviewStatus, n) => ({
      reviewerEmail: `r${n}@example.com`,
      reviewStatus: reviewStatus as Par360Reviewer["reviewStatus"],
      isEmployeeRequested: true,
    }));
    show();
    expect(step("360° feedback")).toHaveTextContent("Minimum met");
  });

  it("greys out the lead review and opens it only once the lead has shared it", async () => {
    const user = userEvent.setup();
    show();
    expect(step("Lead review").querySelector("button")).toBeNull();
    expect(step("Lead review").firstElementChild).toHaveStyle({ opacity: "0.5" });
    expect(step("Face-to-face").firstElementChild).not.toHaveStyle({ opacity: "0.5" });
    cleanup();
    rating = { ...rating, parEmployeeStatus: "SHARED", parLeadStatus: "SHARED" };
    show();
    expect(step("Lead review")).toHaveTextContent("Shared with you");
    expect(step("Lead review").firstElementChild).not.toHaveStyle({ opacity: "0.5" });
    await user.click(step("Lead review").querySelector("button")!);
    expect(screen.getByTestId("where")).toHaveTextContent("/me/performance/cycle/lead-review");
  });
});
