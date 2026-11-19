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
import { renderHook } from "@testing-library/react";
import type { ParCycle, ParRating } from "./types";
import { landingStep } from "../util/parHome";

interface Query<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  isFetching: boolean;
  refetch: () => void;
}
const done = <T>(data: T): Query<T> => ({ data, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() });
const pending = <T>(): Query<T> => ({ isLoading: true, isError: false, isFetching: true, refetch: vi.fn() });
const failing = <T>(): Query<T> => ({
  isLoading: false,
  isError: true,
  error: new Error("Unavailable"),
  isFetching: false,
  refetch: vi.fn(),
});

let rating: Partial<ParRating>;
let count: Query<{ received: number }>;
let results: Query<{ responseCount: number }[]>;

vi.mock("./useParData", () => ({ useParRating: () => done(rating) }));
vi.mock("./usePar360", () => ({ useReviewers: () => done([]) }));
vi.mock("./useReview360", () => ({ useReviewCount: () => count }));
vi.mock("./useLeadership360", () => ({
  cycleSurvey: () => ({ surveyId: 9 }),
  useLeadership360Surveys: () => done([]),
  useLeadership360Results: () => results,
}));

const { useHomeInput } = await import("./useHomeInput");

const FUTURE = "2999-12-31";
const cycle = {
  parCycleId: 2,
  parEmployeeDeadline: FUTURE,
  parThreeSixtyRatingDeadline: FUTURE,
  parLeadDeadline: FUTURE,
  parF2FDeadline: FUTURE,
} as ParCycle;

const originalConfig = window.config;
const leadership360 = (on: boolean) => {
  window.config = { ...(originalConfig ?? {}), ONE_WSO2_PREVIEW_FEATURES: { leadership360: on } } as Window["config"];
};

beforeEach(() => {
  // Shared their self-review, asked no one, and got 3 offered unasked.
  rating = { parEmployeeStatus: "SHARED", parLeadStatus: "PENDING", parF2fStatus: "PENDING" };
  count = done({ received: 3 });
  results = done([{ responseCount: 0 }]);
});

afterEach(() => {
  window.config = originalConfig;
});

describe("useHomeInput", () => {
  it("waits for a member's count, so the landing isn't chosen from none", () => {
    count = pending();
    const { result, rerender } = renderHook(() => useHomeInput(cycle, "me@example.com"));
    expect(result.current.isLoading).toBe(true);

    count = done({ received: 3 });
    rerender();
    expect(result.current.isLoading).toBe(false);
    // 3 received makes 360° feedback Done, so it lands on the self-review rather than asking for more.
    expect(landingStep(result.current.input!)).toBe("self-review");
  });

  it("says when a member's count couldn't be loaded, rather than reading it as none", () => {
    count = failing();
    const { result } = renderHook(() => useHomeInput(cycle, "me@example.com"));
    expect(result.current.failed?.error).toEqual(new Error("Unavailable"));
    result.current.failed!.retry();
    expect(count.refetch).toHaveBeenCalled();
  });

  it("says when a leader's Leadership 360° results couldn't be loaded", () => {
    leadership360(true);
    rating = { ...rating, parIsLeadershipEmployee: true };
    results = failing();
    const { result } = renderHook(() => useHomeInput(cycle, "me@example.com"));
    expect(result.current.failed).toBeDefined();
  });

  it("reads a leader's results with no responses as none, not as a failure", () => {
    leadership360(true);
    rating = { ...rating, parIsLeadershipEmployee: true };
    const { result } = renderHook(() => useHomeInput(cycle, "me@example.com"));
    expect(result.current.failed).toBeUndefined();
    expect(result.current.input?.leadership).toEqual({ responseCount: 0 });
  });

  it("uses a count still loaded from before a failed refetch", () => {
    count = { ...failing(), data: { received: 3 } };
    const { result } = renderHook(() => useHomeInput(cycle, "me@example.com"));
    expect(result.current.failed).toBeUndefined();
    expect(result.current.input?.received).toBe(3);
  });
});
