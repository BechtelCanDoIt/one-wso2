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
import type { ParRating } from "../api/types";

let rating: Partial<ParRating>;
const downloadPar2Pdf = vi.fn();
let profileFails = false;
let selfReviewFails = false;
const retrySelfReview = vi.fn();
let leadership360: { data?: unknown; isLoading: boolean; failed?: { error: unknown; retry: () => void; retrying: boolean } };

vi.mock("@features/my/api/useMeProfile", () => ({
  useMeProfile: () =>
    profileFails
      ? { data: undefined, isLoading: false, isError: true, error: new Error("Unavailable"), refetch: vi.fn() }
      : { data: { userInfo: { workEmail: "me@example.com" } }, isLoading: false, isError: false },
}));
vi.mock("../api/useParData", () => ({
  useActiveParCycle: () => ({ data: [{ parCycleId: 2 }], isLoading: false, isError: false }),
  useParRating: () => ({ data: rating, isLoading: false, isError: false }),
}));
vi.mock("../api/useSelfReview", () => ({
  useSelfReview: () =>
    selfReviewFails
      ? { data: undefined, isError: true, error: new Error("Unavailable"), isFetching: false, refetch: retrySelfReview }
      : { data: { template: { definition: { sections: [] } }, answers: {} }, isError: false },
}));
vi.mock("../api/useLeadership360", () => ({ useCycleLeadership360ForPdf: () => leadership360 }));
vi.mock("@features/leave/api/useLeaveData", () => ({ useLeaveEmployees: () => ({ data: [] }) }));
vi.mock("../util/parPdf", () => ({ downloadPar2Pdf: (...args: unknown[]) => downloadPar2Pdf(...args) }));

const { default: ParCycleLeadReview } = await import("./ParCycleLeadReview");

const SHARED: Partial<ParRating> = { parLeadStatus: "SHARED", parRating: "Successful", parLeadComment: "PHA+R29vZDwvcD4=" };

beforeEach(() => {
  rating = { parRatingId: 9, parEmployeeStatus: "SHARED", parLeadStatus: "DRAFT" };
  downloadPar2Pdf.mockReset();
  profileFails = false;
  selfReviewFails = false;
  retrySelfReview.mockReset();
  leadership360 = { data: undefined, isLoading: false };
});

describe("ParCycleLeadReview", () => {
  it("says it's available once the lead shares their review", () => {
    render(<ParCycleLeadReview />);
    expect(screen.getByText("Available once your lead shares their review.")).toBeInTheDocument();
    expect(screen.queryByText("Lead's feedback")).not.toBeInTheDocument();
  });

  it("shows the rating, then the lead's feedback, once shared, with the PAR's PDF", () => {
    rating = { ...rating, parLeadStatus: "SHARED", parRating: "Successful", parLeadComment: "PHA+R29vZDwvcD4=" };
    render(<ParCycleLeadReview />);
    expect(screen.getByText("Rating")).toBeInTheDocument();
    expect(screen.getByText("Successful")).toBeInTheDocument();
    expect(screen.getByText("Your lead's feedback")).toBeInTheDocument();
    expect(screen.getByText("Good")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(downloadPar2Pdf).toHaveBeenCalledTimes(1);
  });

  it("says when the profile couldn't be loaded, rather than that no cycle is open", () => {
    profileFails = true;
    render(<ParCycleLeadReview />);
    expect(screen.getByText(/Couldn't load your profile/)).toBeInTheDocument();
    expect(screen.queryByText(/no PAR cycle open/)).not.toBeInTheDocument();
  });

  it("keeps Download PDF off until a leader's Leadership 360° lookup is done", () => {
    rating = { ...rating, ...SHARED };
    leadership360 = { data: undefined, isLoading: true };
    render(<ParCycleLeadReview />);
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeDisabled();
  });

  it("offers the self-review again when it couldn't be loaded for the PDF, keeping the feedback", () => {
    rating = { ...rating, ...SHARED };
    selfReviewFails = true;
    render(<ParCycleLeadReview />);
    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.getByText(/Couldn't load your self-review for the PDF/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download PDF" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retrySelfReview).toHaveBeenCalled();
  });

  it("says when a leader's Leadership 360° results couldn't be loaded for the PDF", () => {
    rating = { ...rating, ...SHARED };
    leadership360 = { isLoading: false, failed: { error: new Error("Unavailable"), retry: vi.fn(), retrying: false } };
    render(<ParCycleLeadReview />);
    expect(screen.getByText(/Couldn't load your Leadership 360° results for the PDF/)).toBeInTheDocument();
  });
});
