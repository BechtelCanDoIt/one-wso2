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

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import IndustryTooltip from "./IndustryTooltip";
import { nonZeroEntries, tooltipSurface } from "./industryTooltipModel";

// The hover card over a stacked industry bar. Its content is rendered directly
// with the props recharts hands a custom tooltip, because jsdom cannot hover a
// chart; what is asserted is the card's own decisions — which series it lists,
// and what surface it sits on.

const entry = (name: string, value: number, color = "#2a78d6") => ({ name, value, color });

describe("the series a tooltip lists", () => {
  it("drops a series whose figure for this bar is zero", () => {
    const kept = nonZeroEntries([entry("AMER", 300), entry("EMEA", 0), entry("APAC", 25)]);
    expect(kept.map((item) => item.name)).toEqual(["AMER", "APAC"]);
  });

  it("renders only the non-zero series, under the industry's name", () => {
    render(
      <IndustryTooltip
        active
        label="Utilities"
        payload={[entry("AMER", 1_200_000), entry("EMEA", 0), entry("Other", 0)] as never}
      />,
    );
    const card = screen.getByRole("tooltip");
    expect(within(card).getByText("Utilities")).toBeTruthy();
    expect(within(card).getByText("AMER")).toBeTruthy();
    expect(within(card).queryByText("EMEA")).toBeNull();
    expect(within(card).queryByText("Other")).toBeNull();
    expect(within(card).queryByText("$0")).toBeNull();
  });

  it("renders nothing while no bar is hovered", () => {
    const { container } = render(<IndustryTooltip active={false} label="Utilities" payload={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("the tooltip surface", () => {
  // Oxygen's acrylic themes make `background.paper` a translucent colour
  // (`#ffffffc5` / `#000000c5`), so the card must not be painted with it.
  const palette = {
    background: { paper: "#ffffffc5", default: "#f5f5f5" },
    divider: "#00000012",
    text: { primary: "#40404B" },
  };

  it("is painted with the theme's opaque background, never the translucent paper", () => {
    const surface = tooltipSurface(palette as never);
    expect(surface.background).toBe("#f5f5f5");
    expect(surface.background).not.toBe(palette.background.paper);
  });

  it("takes its border and its text from the theme, so both modes stay legible", () => {
    const surface = tooltipSurface(palette as never);
    expect(surface.border).toBe("1px solid #00000012");
    expect(surface.color).toBe("#40404B");
  });
});
