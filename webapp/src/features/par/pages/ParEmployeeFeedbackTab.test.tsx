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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ParCycle, ParRating } from "../api/types";

const cycle = { parCycleId: 2, parEmployeeDeadline: "2099-12-31", parCycleEndDate: "2099-12-31" } as ParCycle;
const rating = { parRatingId: 9, parEmployeeStatus: "PENDING", parLeadStatus: "PENDING" } as unknown as ParRating;
let selfReview: { data?: unknown; isLoading: boolean; isError: boolean; error?: Error; refetch?: () => void };
let selfReviewLookedUp: boolean | undefined;

vi.mock("@features/my/api/useMeProfile", () => ({
  useMeProfile: () => ({ data: { userInfo: { workEmail: "me@wso2.com" } }, isLoading: false, isError: false }),
}));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));
vi.mock("../api/useParData", () => ({
  useActiveParCycle: () => ({ data: [cycle], isLoading: false, isError: false }),
  useParEmployeeInfo: () => ({ data: { leadEmail: "lead@wso2.com" } }),
  useParRating: () => ({ data: rating, isLoading: false, isError: false }),
}));
vi.mock("../api/useParMutations", () => ({ useSaveParRating: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("../api/useSelfReview", () => ({
  useSelfReview: (_cycleId: number, _email: string, enabled = true) => {
    selfReviewLookedUp = enabled;
    return enabled ? selfReview : { isLoading: false, isError: false };
  },
}));
vi.mock("../components/ParSelfReviewForm", () => ({ default: () => <div>Guided self-review</div> }));
vi.mock("../components/ParRatingSummary", () => ({ default: () => null }));
vi.mock("../components/ParRichTextField", () => ({ default: () => <div>Your comment</div> }));

const { default: ParEmployeeFeedbackTab } = await import("./ParEmployeeFeedbackTab");

const originalConfig = window.config;
const setPar2 = (on: boolean) => {
  window.config = { ...(originalConfig ?? {}), ONE_WSO2_PREVIEW_FEATURES: { par2: on } } as Window["config"];
};
beforeEach(() => {
  selfReview = { isLoading: false, isError: true, error: new Error("HTTP 500"), refetch: vi.fn() };
  selfReviewLookedUp = undefined;
});
afterEach(() => {
  window.config = originalConfig;
});

describe("ParEmployeeFeedbackTab: the guided self-review", () => {
  it("isn't looked up without par2, so today's cycles never depend on it", () => {
    setPar2(false);
    render(<ParEmployeeFeedbackTab />);
    expect(selfReviewLookedUp).toBe(false);
    expect(screen.queryByText(/Couldn't load your self-review/)).not.toBeInTheDocument();
  });

  it("is looked up with par2, and a failed lookup says so", () => {
    setPar2(true);
    render(<ParEmployeeFeedbackTab />);
    expect(selfReviewLookedUp).toBe(true);
    expect(screen.getByText(/Couldn't load your self-review/)).toBeInTheDocument();
  });
});
