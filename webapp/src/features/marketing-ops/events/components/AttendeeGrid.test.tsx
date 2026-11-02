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

// The grid's windowing: only the rows in view (plus a margin) are in the DOM, spacer rows
// stand in for the rest, the row being edited is never dropped, and a jump to a row
// scrolls by index because a far-away row has no element to scroll to.
//
// jsdom has no layout, so every row measures as the default 30px, and the viewport is
// given a height of 600px here: 20 rows in view + 15 overscan = the first 35 rows.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import AttendeeGrid from "./AttendeeGrid";
import type { GridRow } from "../rules/model";
import type { EventsConfig } from "../rules/schema";

const ROW = 30;
const HEADER = 32;
const CONFIG: EventsConfig = {
  statuses: [{ name: "Booth", score: 5, enabled: true }],
  fields: { Booth: [] },
};

const rowsOf = (n: number): GridRow[] =>
  Array.from({ length: n }, (_, i) => {
    const data = { email: `r${i}@x.co` };
    return { id: `row-${i}`, data, original: data, issues: [] };
  });

function renderGrid(rows: GridRow[], extra: Partial<Parameters<typeof AttendeeGrid>[0]> = {}) {
  const props = {
    rows,
    tab: "Booth",
    editable: true,
    busy: false,
    onEdit: vi.fn(),
    onAccept: vi.fn(),
    onReject: vi.fn(),
    config: CONFIG,
    ...extra,
  };
  const utils = render(<AttendeeGrid {...props} />);
  return { ...utils, props };
}

const dataRows = () => document.querySelectorAll("tr[data-row]");
const spacers = () =>
  Array.from(document.querySelectorAll<HTMLElement>("tbody tr[aria-hidden] td")).map(
    (td) => td.style.height,
  );
const scroller = () => document.querySelector("table")!.parentElement as HTMLElement;

let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  // Run the scroll read straight away instead of on the next frame.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  scrollTo = vi.fn();
  Element.prototype.scrollTo = scrollTo as unknown as Element["scrollTo"];
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 600 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
});

function scrollToRow(index: number) {
  const el = scroller();
  act(() => {
    el.scrollTop = HEADER + index * ROW;
    fireEvent.scroll(el);
  });
}

describe("AttendeeGrid windowing", () => {
  it("renders only the rows in view, with a spacer standing in for the rest", () => {
    renderGrid(rowsOf(500));
    expect(dataRows()).toHaveLength(35);
    expect(screen.getByText("r0@x.co")).toBeInTheDocument();
    expect(screen.queryByText("r35@x.co")).not.toBeInTheDocument();
    expect(spacers()).toEqual([`${(500 - 35) * ROW}px`]);
  });

  it("moves the window as the grid scrolls, with spacers above and below", () => {
    renderGrid(rowsOf(500));
    scrollToRow(100);
    // First row in the DOM: 100 - 15 overscan. Last: 100 + 20 in view + 15 overscan.
    expect(screen.queryByText("r84@x.co")).not.toBeInTheDocument();
    expect(screen.getByText("r85@x.co")).toBeInTheDocument();
    expect(screen.getByText("r134@x.co")).toBeInTheDocument();
    expect(screen.queryByText("r135@x.co")).not.toBeInTheDocument();
    expect(spacers()).toEqual([`${85 * ROW}px`, `${(500 - 135) * ROW}px`]);
  });

  it("keeps the row being edited in the DOM when it scrolls out of the window", () => {
    renderGrid(rowsOf(500));
    fireEvent.click(screen.getByText("r0@x.co"));
    const input = screen.getByDisplayValue("r0@x.co");
    scrollToRow(300);
    // Unmounted, the input would take whatever was typed with it — no blur fires.
    expect(input).toBeInTheDocument();
    expect(screen.getByText("r300@x.co")).toBeInTheDocument();
  });

  it("scrolls to a far-away row by its index", () => {
    const rows = rowsOf(500);
    const { rerender, props } = renderGrid(rows);
    scrollTo.mockClear();
    rerender(<AttendeeGrid {...props} jumpToRow={{ rowId: "row-300", nonce: 1 }} />);
    expect(scrollTo).toHaveBeenCalledWith({
      top: HEADER + 300 * ROW - 600 / 2 + ROW / 2,
      behavior: "smooth",
    });
  });

  it("brings a row stepped onto by keyboard into view", () => {
    renderGrid(rowsOf(500));
    scrollToRow(100);
    // Row 119 is the last one fully in view; ArrowDown steps onto 120, just below it.
    fireEvent.click(screen.getByText("r119@x.co"));
    const el = scroller();
    expect(el.scrollTop).toBe(HEADER + 100 * ROW);
    fireEvent.keyDown(screen.getByDisplayValue("r119@x.co"), { key: "ArrowDown" });
    // Scrolled just far enough for row 120's bottom edge to meet the viewport's.
    expect(el.scrollTop).toBe(HEADER + 121 * ROW - 600);
    expect(screen.getByDisplayValue("r120@x.co")).toBeInTheDocument();
  });
});
