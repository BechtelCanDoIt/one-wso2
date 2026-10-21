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

// What the two breakdowns above the account table are made of, as data.

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnalysisBreakdownDonut from "./AnalysisBreakdownDonut";
import type { AnalysisAccountRow } from "./analysisAccountRows";
import { MIS_SCALES, type MisScale } from "../util/misViewVocabulary";
import type { PartnerModelBreakdown } from "../api/useAnalysisBreakdowns";
import { CHART_ENTITY_SERIES, CHART_SERIES_1, CHART_SERIES_2 } from "@components/charts/chartPalette";

// Vitest's 5s default is the wrong one for this file: every test mounts a real
// recharts chart, which computes a full SVG layout in jsdom, and under the full
// suite's parallelism that runs past five seconds while taking well under one
// on its own. Nothing here waits on a timer or a network, so a timeout is
// always machine load rather than a hang.
vi.setConfig({ testTimeout: 20_000 });

// ARR Breakdown: a nested donut, partner model inside and region entity
// outside, with a legend that gives every slice's share and dollars.

const BOTH = new Set(["Channel", "Direct"]);

const breakdown = (over: Partial<PartnerModelBreakdown> = {}): PartnerModelBreakdown => ({
  channel: 300,
  direct: 700,
  asked: BOTH,
  isLoading: false,
  isError: false,
  errorMessage: "",
  retry: () => {},
  ...over,
});

const account = (
  partnerType: string,
  salesRegion: string,
  subRegion: string,
  totalArr: number,
): AnalysisAccountRow =>
  ({ partnerType, salesRegion, subRegion, totalArr }) as AnalysisAccountRow;

const book = [
  account("Channel", "EMEA", "UK", 200),
  account("Channel", "AMER", "US East", 100),
  account("Direct", "AMER", "US East", 500),
  account("Direct", "EMEA", "DACH", 200),
];

function showChart(
  over: Partial<PartnerModelBreakdown> = {},
  {
    scale = MIS_SCALES.UNITS,
    rows = book,
    bySubRegion = false,
  }: { scale?: MisScale; rows?: AnalysisAccountRow[]; bySubRegion?: boolean } = {},
) {
  return render(
    <AnalysisBreakdownDonut
      breakdown={breakdown(over)}
      accounts={rows}
      bySubRegion={bySubRegion}
      scale={scale}
    />,
  );
}

const legendRows = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    );

const sectorFills = (container: HTMLElement, ring: number) =>
  [...container.querySelectorAll(".recharts-pie")[ring]!.querySelectorAll(".recharts-sector")].map(
    (sector) => sector.getAttribute("fill"),
  );

describe("the rings", () => {
  it("draws the partner models inside and the regions outside", () => {
    const { container } = showChart();
    expect(container.querySelectorAll(".recharts-pie")).toHaveLength(2);
    expect(sectorFills(container, 0)).toHaveLength(2);
    // Channel: EMEA and AMER. Direct: AMER and EMEA.
    expect(sectorFills(container, 1)).toHaveLength(4);
  });

  it("keeps Channel and Direct on their own slots and hands out entity hues by rank", () => {
    const { container } = showChart();
    expect(sectorFills(container, 0)).toEqual([CHART_SERIES_1.light, CHART_SERIES_2.light]);
    // AMER (600) outranks EMEA (400), under Channel and under Direct alike.
    const [amer, emea] = CHART_ENTITY_SERIES.map((slot) => slot.light);
    expect(sectorFills(container, 1)).toEqual([emea, amer, amer, emea]);
  });

  it("draws sub-regions in the outer ring when told the cut is by sub-region", () => {
    const { container } = showChart({}, { bySubRegion: true });
    expect(sectorFills(container, 1)).toHaveLength(4);
    expect(screen.getByText(/Sub Region/)).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "DACH" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "EMEA" })).not.toBeInTheDocument();
  });
});

describe("the legend", () => {
  it("gives each slice its dollars and its share of the whole", () => {
    showChart();
    expect(legendRows()).toEqual([
      ["Channel", "300.00", "30.00%"],
      ["EMEA", "200.00", "20.00%"],
      ["AMER", "100.00", "10.00%"],
      ["Direct", "700.00", "70.00%"],
      ["AMER", "500.00", "50.00%"],
      ["EMEA", "200.00", "20.00%"],
    ]);
  });

  it("writes amounts at the reader's Scale and leaves shares alone", () => {
    showChart({ channel: 1000, direct: 1000 }, { scale: MIS_SCALES.THOUSANDS });
    expect(legendRows()[0]).toEqual(["Channel", "1.00", "50.00%"]);
  });

  it("names the cut in the legend's heading", () => {
    showChart();
    expect(screen.getByRole("columnheader", { name: "Partner model / Region" })).toBeInTheDocument();
  });
});

describe("when one model holds everything", () => {
  it("still draws both rings, with the one model filling the inner ring", () => {
    const { container } = showChart({ channel: 0, direct: 1000 });
    expect(sectorFills(container, 0)).toHaveLength(1);
    expect(legendRows()[0]).toEqual(["Direct", "1,000.00", "100.00%"]);
  });
});

describe("when one model was asked and did not answer", () => {
  it("draws no rings rather than the survivor at 100%", () => {
    const { container } = showChart({ channel: undefined, direct: 700 });
    expect(container.querySelector(".recharts-pie")).toBeNull();
    expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
  });

  it("says the split could not be loaded, and offers a retry", async () => {
    const retry = vi.fn();
    showChart({ channel: undefined, direct: 700, retry });
    expect(screen.getByText(/didn't load/i)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: /retry/i }));
    expect(retry).toHaveBeenCalled();
  });
});

describe("when the reader narrowed to a third partner type", () => {
  it("says the split does not apply, rather than claiming there is no ARR", () => {
    showChart({ channel: undefined, direct: undefined, asked: new Set() });
    expect(screen.getByRole("status")).toHaveTextContent(/don't apply/i);
  });
});

describe("the states that are not a split", () => {
  it("says there is no ARR rather than drawing empty rings", () => {
    const { container } = showChart({ channel: 0, direct: 0 });
    expect(screen.getByRole("status")).toHaveTextContent("No ARR in this view.");
    expect(container.querySelector(".recharts-pie")).toBeNull();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the failure with a retry", async () => {
    const retry = vi.fn();
    showChart({
      channel: undefined,
      direct: undefined,
      isError: true,
      errorMessage: "Gateway timed out.",
      retry,
    });
    expect(screen.getByText(/Gateway timed out/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: /retry/i }));
    expect(retry).toHaveBeenCalled();
  });

  it("shows no figures while the reads are in flight", () => {
    const { container } = showChart({ channel: undefined, direct: undefined, isLoading: true });
    expect(container.querySelector(".recharts-pie")).toBeNull();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
