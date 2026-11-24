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
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTravelCostView } from "./useTravelCostView";

const wrap =
  (search = "") =>
  ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[`/dashboard${search}`]}>{children}</MemoryRouter>;

describe("useTravelCostView business date", () => {
  // 25 Nov in the browser's own zone while the backend's UTC day is still 24 Nov (anywhere ahead of Greenwich after local midnight).
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 25, 0, 30));
  });
  afterEach(() => vi.useRealTimers());

  it("ends the default Year to Date on the backend's date, as the page header does", () => {
    const { result } = renderHook(() => useTravelCostView("2026-11-24"), { wrapper: wrap() });
    expect(result.current.view.period).toEqual({ from: "2026-01-01", to: "2026-11-24" });
  });

  it("builds every preset from the backend's date", () => {
    const { result } = renderHook(() => useTravelCostView("2026-11-24"), { wrapper: wrap("?tcRange=mtd") });
    expect(result.current.view.period).toEqual({ from: "2026-11-01", to: "2026-11-24" });
  });

  it("uses the browser's date only until the backend's has loaded", () => {
    const { result, rerender } = renderHook(({ date }: { date?: string }) => useTravelCostView(date), { wrapper: wrap(), initialProps: {} as { date?: string } });
    expect(result.current.view.period.to).toBe("2026-11-25");
    rerender({ date: "2026-11-24" });
    expect(result.current.view.period.to).toBe("2026-11-24");
  });

  it("keeps an explicit custom range whatever the date", () => {
    const { result } = renderHook(() => useTravelCostView("2026-11-24"), { wrapper: wrap("?tcRange=custom&tcFrom=2026-03-01&tcTo=2026-03-31") });
    expect(result.current.view.period).toEqual({ from: "2026-03-01", to: "2026-03-31" });
  });
});
