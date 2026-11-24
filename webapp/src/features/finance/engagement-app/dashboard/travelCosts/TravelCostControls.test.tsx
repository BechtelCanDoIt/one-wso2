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
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FilterKey } from "./costView";
import type { CostCtx } from "../widgets/types";
import { readCostView } from "./costView";
import TravelCostControls from "./TravelCostControls";

function controls(raw: Record<string, string>, set = vi.fn()) {
  const cost = {
    view: readCostView(raw, "2026-11-24"),
    set,
    drill: vi.fn(),
    params: {},
    query: { data: undefined },
    exportCsv: vi.fn(),
  } as unknown as CostCtx;
  render(<TravelCostControls cost={cost} today="2026-11-24" canDownloadTransactions={false} />);
  return set;
}

describe("TravelCostControls view toggle", () => {
  it("is two icon buttons named Charts and Tables, the current one pressed", () => {
    controls({});
    expect(screen.getByRole("button", { name: "Charts" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Tables" }).getAttribute("aria-pressed")).toBe("false");
    // Icons only: the names are labels, not visible text.
    expect(screen.getByRole("button", { name: "Tables" }).textContent).toBe("");
  });

  it("presses Tables when the address bar says so", () => {
    controls({ tcView: "tables" });
    expect(screen.getByRole("button", { name: "Tables" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("writes the same URL state as before", () => {
    const set = controls({});
    fireEvent.click(screen.getByRole("button", { name: "Tables" }));
    expect(set).toHaveBeenCalledWith({ tcView: "tables" });
  });

  it("goes back to Charts by clearing the key", () => {
    const set = controls({ tcView: "tables" });
    fireEvent.click(screen.getByRole("button", { name: "Charts" }));
    expect(set).toHaveBeenCalledWith({ tcView: undefined });
  });
});

describe("TravelCostControls drill feedback", () => {
  const rect = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  const scroll = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    scroll.mockClear();
    Element.prototype.scrollIntoView = scroll;
  });
  afterEach(() => vi.useRealTimers());

  function shown(rectOfChips: DOMRect, drill?: { id: number; key: FilterKey; value: string }) {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rectOfChips);
    const cost = { view: readCostView({ tcSource: "invoice" }, "2026-11-24"), set: vi.fn(), drill: vi.fn(), params: {}, query: { data: undefined }, exportCsv: vi.fn(), lastDrill: drill } as unknown as CostCtx;
    const ui = (c: CostCtx) => <TravelCostControls cost={c} today="2026-11-24" canDownloadTransactions={false} />;
    const r = render(ui(cost));
    return { r, again: (d: { id: number; key: FilterKey; value: string }) => r.rerender(ui({ ...cost, lastDrill: d })) };
  }

  it("says what a click filtered by, highlights that chip for a moment and scrolls the controls into view when they are off-screen", () => {
    const { again } = shown(rect(-300, -270));
    expect(screen.getByRole("status").textContent).toBe("");
    again({ id: 1, key: "tcSource", value: "invoice" });
    expect(screen.getByRole("status").textContent).toMatch(/^Filtered by Source: /);
    expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "smooth" });
    const chip = screen.getByText(/^Source:/).closest(".MuiChip-root") as HTMLElement;
    expect(chip.getAttribute("data-highlighted")).toBe("true");
    act(() => void vi.advanceTimersByTime(1600));
    expect(chip.getAttribute("data-highlighted")).toBeNull();
  });

  it("does not scroll when the controls are already in view", () => {
    const { again } = shown(rect(120, 260));
    again({ id: 1, key: "tcSource", value: "invoice" });
    expect(scroll).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toMatch(/Filtered by Source/);
  });

  it("scrolls when the controls sit under the app bar", () => {
    const { again } = shown(rect(20, 160));
    again({ id: 1, key: "tcSource", value: "invoice" });
    expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "smooth" });
  });
});
