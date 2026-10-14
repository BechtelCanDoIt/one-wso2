/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import LeaveDateField from "./LeaveDateField";

function show(props: Partial<Parameters<typeof LeaveDateField>[0]> = {}) {
  const onChange = vi.fn();
  render(<LeaveDateField label="Last sabbatical" value="" onChange={onChange} {...props} />);
  return onChange;
}

describe("the year list", () => {
  // The browser's own picker listed every year and only greyed out the ones
  // outside the bounds. This one lists only the years that can be picked.
  it("offers only the years between min and max", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    show({ min: "2024-09-01", max: "2026-10-14" });
    await user.click(screen.getByRole("button", { name: /choose date/i }));
    await user.click(await screen.findByRole("button", { name: /switch to year view/i }));
    const years = within(await screen.findByRole("radiogroup")).getAllByRole("radio");
    expect(years.map((y) => y.textContent)).toEqual(["2024", "2025", "2026"]);
  });
});

describe("the calendar popup", () => {
  // Several date fields sit side by side, so the open calendar has to say
  // which one it belongs to.
  it("is named after its field", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    show();
    await user.click(screen.getByRole("button", { name: /choose date/i }));
    expect(await screen.findByRole("dialog", { name: "Last sabbatical calendar" })).toBeInTheDocument();
  });
});

describe("a typed date", () => {
  it("comes back as YYYY-MM-DD", () => {
    const onChange = show({ min: "2024-09-01", max: "2026-10-14" });
    fireEvent.change(screen.getByLabelText("Last sabbatical"), { target: { value: "2025-03-04" } });
    expect(onChange).toHaveBeenLastCalledWith("2025-03-04");
  });

  // A native input let a typed date straight past min and max.
  it("before min is no date at all", () => {
    const onChange = show({ min: "2024-09-01", max: "2026-10-14" });
    fireEvent.change(screen.getByLabelText("Last sabbatical"), { target: { value: "2020-01-01" } });
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("after max is no date at all", () => {
    const onChange = show({ min: "2024-09-01", max: "2026-10-14" });
    fireEvent.change(screen.getByLabelText("Last sabbatical"), { target: { value: "2027-01-01" } });
    expect(onChange).toHaveBeenLastCalledWith("");
  });
});
