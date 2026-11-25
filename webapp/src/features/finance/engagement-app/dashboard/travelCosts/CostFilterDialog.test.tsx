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
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  travel: { data: undefined, isFetching: false, isPlaceholderData: false } as Record<string, unknown>,
}));

vi.mock("@hooks/useDebouncedValue", () => ({ useDebouncedValue: <T,>(v: T) => v }));
vi.mock("../../api/useEngagementApi", () => ({
  useTravelRequests: () => state.travel,
  useEmployees: () => ({
    data: [
      { email: "ann@wso2.com", name: "Ann Perera" },
      { email: "bob@wso2.com", name: "Bob Silva" },
    ],
    isFetching: false,
    isError: false,
  }),
}));
vi.mock("../../api/useEngagementUserInfo", () => ({ useEngagementAccess: () => ({ travelRequests: true }) }));
vi.mock("../../api/usePeopleFaces", () => ({ usePeopleFaces: () => () => ({}) }));

import CostFilterDialog from "./CostFilterDialog";
import { readCostView } from "./costView";

const trip = (jobNumber: string) => ({ jobNumber, traveller: { name: "Ann Perera" }, country: "LK", start: "2026-01-01", end: "2026-01-05" });

function open() {
  const view = readCostView({}, "2026-11-24");
  return render(<CostFilterDialog view={view} facets={undefined} onApply={vi.fn()} onClose={vi.fn()} />);
}

describe("CostFilterDialog", () => {
  beforeEach(() => {
    state.travel = { data: undefined, isFetching: false, isPlaceholderData: false };
  });

  it("adds two employees one after another, keeping the same search box with its focus and emptying it each time", () => {
    open();
    const box = screen.getByRole("combobox", { name: "Employee" }) as HTMLInputElement;
    box.focus();
    fireEvent.change(box, { target: { value: "an" } });
    fireEvent.click(screen.getByText("Ann Perera"));
    expect(screen.getByRole("combobox", { name: "Employee" })).toBe(box);
    expect(document.activeElement).toBe(box);
    expect(box.value).toBe("");
    fireEvent.change(box, { target: { value: "bo" } });
    fireEvent.click(screen.getByText("Bob Silva"));
    expect(screen.getByRole("combobox", { name: "Employee" })).toBe(box);
    expect(document.activeElement).toBe(box);
    expect(box.value).toBe("");
    expect(screen.getByText("ann@wso2.com")).toBeTruthy();
    expect(screen.getByText("bob@wso2.com")).toBeTruthy();
  });

  it("does not offer the previous search's job numbers while the new search loads", () => {
    state.travel = { data: { items: [trip("AB-1")] }, isFetching: false, isPlaceholderData: false };
    open();
    const box = screen.getByRole("combobox", { name: "Travel Job Number" }) as HTMLInputElement;
    fireEvent.change(box, { target: { value: "AB" } });
    expect(screen.getByText("AB-1")).toBeTruthy();
    state.travel = { data: { items: [trip("AB-1")] }, isFetching: true, isPlaceholderData: true };
    fireEvent.change(box, { target: { value: "XY" } });
    expect(screen.queryByText("AB-1")).toBeNull();
    expect(box.value).toBe("XY");
  });
});
