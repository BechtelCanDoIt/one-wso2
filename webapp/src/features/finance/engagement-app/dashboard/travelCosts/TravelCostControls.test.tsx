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
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
