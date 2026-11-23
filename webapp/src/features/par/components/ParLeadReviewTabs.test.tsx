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

const cycle = { parCycleId: 2 } as ParCycle;
const rating = { parEmployeeName: "Alex Morgan", parLeadStatus: "DRAFT" } as ParRating;
const retry = vi.fn();
let par2: { showsPar2: boolean; isLoading: boolean; error: Error | null; retry: () => void; retrying: boolean };

vi.mock("../api/useParData", () => ({ useParRating: () => ({ data: rating, isSuccess: true }) }));
vi.mock("../api/useReview360", () => ({ useParShowsPar2: () => par2 }));
vi.mock("@features/leave/api/useLeaveData", () => ({ useLeaveEmployees: () => ({ data: [] }) }));
vi.mock("./ParLeadReviewPanel", () => ({ default: () => <div>Lead's review</div> }));
vi.mock("./ParLead360ReviewsTab", () => ({ default: () => <div>360° evidence</div> }));
vi.mock("./ParLeadF2fPanel", () => ({ default: () => null }));
vi.mock("./ParLeadHistoryModal", () => ({ default: () => null }));
vi.mock("./ParUpdateStatusPanel", () => ({ default: () => null }));

const { default: ParLeadReviewTabs } = await import("./ParLeadReviewTabs");

const show = () => render(<ParLeadReviewTabs cycle={cycle} employeeEmail="alex@example.com" onBack={() => {}} />);

beforeEach(() => {
  retry.mockReset();
  par2 = { showsPar2: true, isLoading: false, error: null, retry, retrying: false };
});

describe("ParLeadReviewTabs: whether it's a PAR 2.0 cycle", () => {
  it("shows the review once that's known", () => {
    show();
    expect(screen.getByText("Lead's review")).toBeInTheDocument();
  });

  it("shows neither the review nor the 360° tab while that's loading", () => {
    par2 = { ...par2, showsPar2: false, isLoading: true };
    show();
    expect(screen.queryByText("Lead's review")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "360 Reviews" }));
    expect(screen.queryByText("360° evidence")).not.toBeInTheDocument();
  });

  it("says when that couldn't be looked up, with Retry, instead of the regular review", () => {
    par2 = { ...par2, showsPar2: false, error: new Error("HTTP 500") };
    show();
    expect(screen.queryByText("Lead's review")).not.toBeInTheDocument();
    expect(screen.getByText(/Couldn't load this PAR record/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(retry).toHaveBeenCalled();
  });
});
