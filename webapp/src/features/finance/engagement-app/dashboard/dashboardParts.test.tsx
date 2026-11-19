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

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HBars } from "./dashboardParts";

const rows = [
  { label: "Classic Travels", count: 14 },
  { label: "Hemas", count: 1 },
  { label: "WSO2", count: 1 },
];

describe("HBars", () => {
  // The count and its share are separate words, so copy-paste and screen readers read "14 88%", not "1488%".
  it("separates the count from its percentage with a real space", () => {
    const { getByTitle } = render(<HBars rows={rows} percent />);
    const row = getByTitle("Classic Travels").parentElement!;
    expect(row.textContent).toContain("14 88%");
    expect(row.textContent).not.toContain("1488%");
  });

  it("shows the count alone without percent", () => {
    const { getByTitle } = render(<HBars rows={rows} />);
    const row = getByTitle("Classic Travels").parentElement!;
    expect(row.textContent?.endsWith("14")).toBe(true);
    expect(row.textContent).not.toContain("%");
  });
});
