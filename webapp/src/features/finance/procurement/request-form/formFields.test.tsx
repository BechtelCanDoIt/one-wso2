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

import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChipsField, OptionField, SelectField, TextInput, YesNoField, YesNoList } from "./formFields";

const choices = (...labels: string[]) => labels.map((label, i) => ({ value: `C-${i + 1}`, label }));

function Chips({ initial = [] as string[] }) {
  const [values, setValues] = useState(initial);
  return <ChipsField label="User names" values={values} onChange={setValues} placeholder="e.g. Jane Silva" />;
}

describe("form fields", () => {
  it("label the control they sit above", () => {
    render(<TextInput required label="Product / solution name" value="" onChange={() => {}} />);
    expect(screen.getByLabelText(/Product \/ solution name/)).toBeRequired();
  });

  it("ChipsField adds a trimmed entry on Enter, ignores a repeat, and removes with Backspace", async () => {
    const user = userEvent.setup();
    render(<Chips />);
    const input = screen.getByLabelText("User names");
    await user.type(input, "  Jane Silva  {Enter}");
    await user.type(input, "jane silva{Enter}");
    await user.type(input, "Raj Perera{Enter}");
    expect(screen.getByText("Jane Silva")).toBeInTheDocument();
    expect(screen.getByText("Raj Perera")).toBeInTheDocument();
    expect(screen.queryByText("jane silva")).toBeNull();

    await user.type(input, "{Backspace}");
    expect(screen.queryByText("Raj Perera")).toBeNull();
    expect(screen.getByText("Jane Silva")).toBeInTheDocument();
  });

  it("SelectField shows its placeholder until something is chosen", async () => {
    const user = userEvent.setup();
    function Host() {
      const [value, setValue] = useState("");
      return <SelectField required label="Expected usage period" placeholder="Select duration" options={["1 year", "2 years"]} value={value} onChange={setValue} />;
    }
    render(<Host />);
    expect(screen.getByText("Select duration")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "2 years" }));
    expect(screen.getByRole("combobox")).toHaveTextContent("2 years");
  });

  it("OptionField shows labels for the codes it holds, and keeps a saved code that is no longer listed", () => {
    const { rerender } = render(<OptionField required label="Region" choices={choices("APAC", "EMEA")} value="C-2" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("EMEA");
    rerender(<OptionField label="Region" choices={choices("APAC", "EMEA")} value="OLD-9" onChange={() => {}} />);
    expect(screen.getByLabelText("Region")).toHaveValue("OLD-9");
  });

  it("OptionField hands back the code, never the label", async () => {
    const user = userEvent.setup();
    let chosen = "";
    render(<OptionField required label="Region" choices={choices("APAC", "EMEA")} value="" onChange={(v) => (chosen = v)} />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "EMEA" }));
    expect(chosen).toBe("C-2");
  });

  it("OptionField says why it is empty, and is disabled when there is nothing to choose", () => {
    render(<OptionField required label="Engagement code" choices={[]} value="" onChange={() => {}} emptyText="No engagement codes for this business unit" />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("combobox")).toHaveTextContent("No engagement codes for this business unit");
  });

  it("never lists a None choice: a required list is a select, an optional one is cleared with its X", async () => {
    const user = userEvent.setup();
    function Optional() {
      const [value, setValue] = useState("C-2");
      return <OptionField label="Region" choices={choices("APAC", "EMEA")} value={value} onChange={setValue} />;
    }
    const { unmount } = render(<Optional />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.queryByRole("option", { name: /none/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByLabelText("Region")).toHaveValue("");
    unmount();

    render(<OptionField required label="Budget category" choices={choices("A", "B")} value="" onChange={() => {}} />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("option", { name: /none/i })).toBeNull();
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("OptionField exposes a required state on its select and on its searchable list, not only in the label", () => {
    const { rerender } = render(<OptionField required label="Region" choices={choices("A", "B")} value="" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-required", "true");
    const many = Array.from({ length: 12 }, (_, i) => `Option ${i + 1}`);
    rerender(<OptionField required label="Region" choices={choices(...many)} value="" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toBeRequired();
    rerender(<OptionField label="Region" choices={choices(...many)} value="" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).not.toBeRequired();
  });

  it("YesNoField opens its follow-up inside the row only on Yes", async () => {
    const user = userEvent.setup();
    function Host() {
      const [value, setValue] = useState<"yes" | "no" | "">("");
      return (
        <YesNoList>
          <YesNoField label="Will it store PII?" value={value} onChange={setValue}>
            <TextInput label="What data would this include?" value="" onChange={() => {}} />
          </YesNoField>
        </YesNoList>
      );
    }
    render(<Host />);
    expect(screen.queryByLabelText("What data would this include?")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(screen.getByLabelText("What data would this include?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByLabelText("What data would this include?")).toBeNull();
  });
});
