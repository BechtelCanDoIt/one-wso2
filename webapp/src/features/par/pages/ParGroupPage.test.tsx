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
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

let par2: { showsPar2: boolean; isLoading: boolean; error: Error | null };

vi.mock("@features/my/api/useMeProfile", () => ({
  useMeProfile: () => ({ data: { userInfo: { workEmail: "me@example.com" } }, isLoading: false }),
}));
vi.mock("../api/useParData", () => ({
  useActiveParCycle: () => ({ data: [{ parCycleId: 2 }], isLoading: false }),
  useParEmployeeItemVisible: vi.fn(),
  useParHasActiveCycle: vi.fn(),
  useParHasLead: vi.fn(),
}));
vi.mock("../api/useReview360", () => ({ useParShowsPar2: () => par2 }));

const { ParRequiresPar2CycleRoute } = await import("./ParGroupPage");

const show = () =>
  render(
    <MemoryRouter initialEntries={["/me/performance/cycle/self-review"]}>
      <Routes>
        <Route path="/me/performance" element={<div>First tab</div>} />
        <Route
          path="/me/performance/cycle/self-review"
          element={
            <ParRequiresPar2CycleRoute>
              <div>Self-review</div>
            </ParRequiresPar2CycleRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  par2 = { showsPar2: true, isLoading: false, error: null };
});

describe("ParRequiresPar2CycleRoute", () => {
  it("opens Active cycle in a cycle with the PAR 2.0 forms", () => {
    show();
    expect(screen.getByText("Self-review")).toBeInTheDocument();
  });

  it("opens the first tab instead, by URL, in any other cycle", () => {
    par2 = { ...par2, showsPar2: false };
    show();
    expect(screen.getByText("First tab")).toBeInTheDocument();
    expect(screen.queryByText("Self-review")).not.toBeInTheDocument();
  });

  it("shows nothing while that's looked up, or when it couldn't be", () => {
    par2 = { showsPar2: false, isLoading: true, error: null };
    const { unmount } = show();
    expect(screen.queryByText("Self-review")).not.toBeInTheDocument();
    expect(screen.queryByText("First tab")).not.toBeInTheDocument();
    unmount();
    par2 = { showsPar2: false, isLoading: false, error: new Error("HTTP 500") };
    show();
    expect(screen.queryByText("Self-review")).not.toBeInTheDocument();
    expect(screen.queryByText("First tab")).not.toBeInTheDocument();
  });
});
