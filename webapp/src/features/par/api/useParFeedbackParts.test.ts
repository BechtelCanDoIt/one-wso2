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
import { renderHook } from "@testing-library/react";
import type { ParCycle } from "./types";

const open = { parCycleId: 7, parCycleName: "2026", parThreeSixtyRatingDeadline: "2999-12-31" } as ParCycle;
const failed = new Error("Network error");

let activeCycles: { data?: ParCycle[]; error: Error | null; isLoading: boolean };
let forms: { showsPar2: boolean; isLoading: boolean; error: Error | null };

vi.mock("@config/previewFeatures", () => ({ isPreviewEnabled: () => true }));
vi.mock("./useParData", () => ({
  useActiveParCycle: () => activeCycles,
  useParHasLead: () => ({ hasLead: true, isLoading: false }),
  useParHasActiveCycle: () => ({ isActive: true, isLoading: false }),
}));
vi.mock("./useReview360", () => ({ useParShowsPar2: () => forms }));

const { useParFeedbackParts } = await import("./useParFeedbackParts");
const parts = () => renderHook(() => useParFeedbackParts("me@wso2.com", false)).result.current;

beforeEach(() => {
  activeCycles = { data: [open], error: null, isLoading: false };
  forms = { showsPar2: true, isLoading: false, error: null };
});

describe("useParFeedbackParts", () => {
  it("gives feedback in the open cycle while its 360° window is open", () => {
    expect(parts()).toMatchObject({ feedbackCycle: open, held: false, error: null });
  });

  it("holds feedback for the next cycle when no cycle is open", () => {
    activeCycles = { data: [], error: null, isLoading: false };
    expect(parts()).toMatchObject({ feedbackCycle: { parCycleId: 0 }, held: true, error: null });
  });

  it("has nowhere to give feedback when the open cycle can't be looked up", () => {
    activeCycles = { data: undefined, error: failed, isLoading: false };
    expect(parts()).toMatchObject({ feedbackCycle: undefined, held: false, error: failed });
  });

  it("has nowhere to give feedback when the cycle's forms can't be looked up", () => {
    forms = { showsPar2: false, isLoading: false, error: failed };
    expect(parts()).toMatchObject({ feedbackCycle: undefined, held: false, error: failed });
  });

  it("doesn't give feedback in the open cycle alongside an error", () => {
    forms = { showsPar2: true, isLoading: false, error: failed };
    expect(parts()).toMatchObject({ feedbackCycle: undefined, held: false, error: failed });
  });

  it("keeps the open cycle it already had when a refetch fails", () => {
    activeCycles = { data: [open], error: failed, isLoading: false };
    expect(parts()).toMatchObject({ feedbackCycle: open, held: false, error: null });
  });

  it("keeps holding feedback when a refetch fails after no cycle was open", () => {
    activeCycles = { data: [], error: failed, isLoading: false };
    expect(parts()).toMatchObject({ feedbackCycle: { parCycleId: 0 }, held: true, error: null });
  });
});
