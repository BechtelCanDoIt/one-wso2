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

import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState, type JSX } from "react";
import { describe, expect, it } from "vitest";
import ManageWidgetsDialog from "./ManageWidgetsDialog";
import { DEFAULT_PREFS, type WidgetPrefs } from "./widgetPrefs";

const allowed = [
  { id: "my-work", defaultOn: true },
  { id: "tc-source", defaultOn: true },
  { id: "tc-lines", defaultOn: false },
];

function Harness({ start = DEFAULT_PREFS }: { start?: WidgetPrefs }): JSX.Element {
  const [prefs, setPrefs] = useState(start);
  return <ManageWidgetsDialog allowed={allowed} prefs={prefs} onChange={(f) => setPrefs(f)} onReset={() => setPrefs(DEFAULT_PREFS)} onClose={() => undefined} />;
}

describe("ManageWidgetsDialog", () => {
  it("lists the allowed widgets under their groups, with checkboxes named by title", () => {
    render(<Harness />);
    expect(screen.getByRole("region", { name: "Travel Costs" })).toBeTruthy();
    expect((screen.getByRole("checkbox", { name: "My Work" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Transactions" }) as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByRole("checkbox", { name: "Travel Agent Comparison" })).toBeNull();
  });

  it("turns a widget off and on", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "My Work" }));
    expect((screen.getByRole("checkbox", { name: "My Work" }) as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: "Transactions" }));
    expect((screen.getByRole("checkbox", { name: "Transactions" }) as HTMLInputElement).checked).toBe(true);
  });

  it("pins a widget with a toggle button that says so", () => {
    render(<Harness />);
    const pin = screen.getByRole("button", { name: "Pin My Work to the top" });
    expect(pin.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(pin);
    expect(screen.getByRole("button", { name: "Pin My Work to the top" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("resets to the defaults", () => {
    render(<Harness start={{ ...DEFAULT_PREFS, hidden: ["my-work"], shown: ["tc-lines"], pinned: ["tc-source"] }} />);
    expect((screen.getByRole("checkbox", { name: "My Work" }) as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Reset to Default" }));
    expect((screen.getByRole("checkbox", { name: "My Work" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Transactions" }) as HTMLInputElement).checked).toBe(false);
    const group = screen.getByRole("region", { name: "Travel Costs" });
    expect(within(group).getByRole("button", { name: "Pin Spend by Source to the top" }).getAttribute("aria-pressed")).toBe("false");
  });
});
