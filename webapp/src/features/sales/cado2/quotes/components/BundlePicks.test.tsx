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

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BundleChild } from "@features/sales/cado2/quotes/api/quoteTypes";
import { NO_PICKS } from "@features/sales/cado2/quotes/form/bundlePicks";
import BundlePicks from "./BundlePicks";

const child = (id: string, addMode: BundleChild["addMode"], choiceName: string | null = null) =>
  ({ id, name: `Product ${id}`, addMode, choiceName, fixedQuantity: null, pricebookEntries: [] }) as unknown as BundleChild;

// D131: long lists don't crowd the dialog.
describe("BundlePicks", () => {
  it("shows a short choice as radio buttons and a long one as a dropdown, nothing picked", async () => {
    const items = [
      child("E", "CHOOSE_ONE", "Support tier"),
      child("P", "CHOOSE_ONE", "Support tier"),
      ...["1", "2", "3", "4", "5"].map((n) => child(`S${n}`, "CHOOSE_ONE", "Size")),
    ];
    const onChange = vi.fn();
    render(<BundlePicks items={items} value={NO_PICKS} onChange={onChange} parentQuantity="4" showMissing={false} />);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    const size = screen.getByRole("combobox", { name: "Size" });
    expect(size).toHaveTextContent("Pick a size");
    await userEvent.setup().click(size);
    await userEvent.setup().click(screen.getByRole("option", { name: /Product S3/ }));
    expect(onChange).toHaveBeenCalledWith({ choices: { Size: "S3" }, optional: [] });
  });

  it("scrolls a long optional list in place", () => {
    const many = ["1", "2", "3", "4", "5", "6", "7"].map((n) => child(`O${n}`, "OPTIONAL"));
    const { unmount } = render(<BundlePicks items={many} value={NO_PICKS} onChange={vi.fn()} parentQuantity="1" showMissing={false} />);
    const list = screen.getByRole("group", { name: "Optional" });
    expect(within(list).getAllByRole("checkbox")).toHaveLength(7);
    expect(list).toHaveStyle({ overflowY: "auto" });
    unmount();
    render(<BundlePicks items={many.slice(0, 3)} value={NO_PICKS} onChange={vi.fn()} parentQuantity="1" showMissing={false} />);
    expect(screen.getByRole("group", { name: "Optional" })).not.toHaveStyle({ overflowY: "auto" });
  });
});
