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
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExcelJS from "exceljs";
import { bytesOf, captureDownloads } from "@/test/downloads";
import MisOpportunities from "./MisOpportunities";
import type { OpportunityResponse } from "./opportunityRows";
import { MIS_SCALES, type MisScale } from "../util/misViewVocabulary";
import type { OpportunitiesState } from "../api/useOpportunities";

// Vitest's 5s default is the wrong one for this file — it mounts a real
// `BuildTable` of twenty columns, which is expensive in jsdom and runs past
// five seconds under the full suite's parallelism while taking a fraction of
// one alone. Same line as this repo's other table-mounting suites.
vi.setConfig({ testTimeout: 20_000 });

const ACCOUNT = { id: "ACC-1", name: "Northwind" };

const opportunity = (over: Partial<OpportunityResponse> = {}): OpportunityResponse => ({
  id: "OPP-1",
  name: "Renewal FY26",
  stageName: "Closed Won",
  confidence: "80",
  partnerType: "Direct",
  subscriptionStartDate: "2026-01-01",
  subscriptionEndDate: "2026-12-31",
  apimArr: 1000,
  iamArr: 0,
  integrationArr: 0,
  apimCloudArr: 0,
  iamCloudArr: 0,
  integrationCloudArr: 0,
  choreoArr: 0,
  agentPlatformArr: 0,
  moesifArr: 0,
  ...over,
});

const state = (over: Partial<OpportunitiesState> = {}): OpportunitiesState => ({
  opportunities: [opportunity()],
  isLoading: false,
  isError: false,
  errorMessage: "",
  retry: () => {},
  ...over,
});

function showDialog({
  over = {},
  scale = MIS_SCALES.UNITS,
  asOf = "2026/06/30",
}: { over?: Partial<OpportunitiesState>; scale?: MisScale; asOf?: string } = {}) {
  return render(
    <MisOpportunities
      open
      onClose={() => {}}
      account={ACCOUNT}
      asOf={asOf}
      state={state(over)}
      scale={scale}
    />,
  );
}

describe("the dialog", () => {
  // The account is not on the response — the request asks BY account id — so
  // the title is the only thing naming what the reader opened.
  it("names the account and the date it was opened at", () => {
    showDialog();
    expect(screen.getByRole("heading", { name: /Northwind/ })).toHaveTextContent("2026/06/30");
  });

  it("lists the opportunity, with the account stamped on it", () => {
    showDialog();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Renewal FY26")).toBeInTheDocument();
    expect(within(table).getAllByText("Northwind").length).toBeGreaterThan(0);
    expect(within(table).getByText("ACC-1")).toBeInTheDocument();
  });

  it("counts what it is showing", () => {
    showDialog();
    expect(screen.getByText("1 opportunity")).toBeInTheDocument();
  });

  it("writes figures at the reader's Scale, under a caption saying which", () => {
    showDialog({ scale: MIS_SCALES.THOUSANDS });
    expect(screen.getByText(/All amounts in USD '000/)).toBeInTheDocument();
    // 1,000 at thousands is 1.00.
    expect(screen.getAllByText("1.00").length).toBeGreaterThan(0);
  });

  // Prefer the backend's aggregate when positive, sum
  // the components otherwise. Asserted on screen because the total is the
  // figure Finance reconciles.
  it("totals software from the components when the backend sent no aggregate", () => {
    showDialog({ over: { opportunities: [opportunity({ iamArr: 500 })] } });
    // 1000 + 500 + 0, formatted at units.
    expect(screen.getAllByText("1,500.00").length).toBeGreaterThan(0);
  });
});

describe("the states that are not a list", () => {
  // "Select an account under a date range to view
  // opportunities" for every failure, because reading `.message` off a string
  // is always undefined — a sentence that blames the reader for a timeout.
  it("surfaces the backend's message, with a retry", () => {
    const retry = vi.fn();
    showDialog({ over: { isError: true, errorMessage: "Gateway timed out.", opportunities: [], retry } });
    expect(screen.getByText(/Gateway timed out/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("says an account has none, rather than showing an empty table", () => {
    showDialog({ over: { opportunities: [] } });
    expect(screen.getByRole("status")).toHaveTextContent(/No opportunities for this account/);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows no table while the read is in flight", () => {
    showDialog({ over: { isLoading: true, opportunities: [] } });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("finding one opportunity in the list", () => {
  const BOOK = [
    opportunity({ id: "OPP-1", name: "Renewal FY26", stageName: "Closed Won", apimArr: 1000 }),
    opportunity({ id: "OPP-2", name: "Expansion Apac", stageName: "Negotiation", apimArr: 90_000 }),
    opportunity({ id: "OPP-3", name: "renewal west", stageName: "Closed Won", apimArr: 12_000 }),
  ];
  const table = () => screen.getByRole("table", { name: "Opportunities behind this account", hidden: true });
  const names = () =>
    within(table())
      .getAllByRole("row", { hidden: true })
      .slice(1)
      .map((row) => row.children[3]?.textContent ?? "");
  const header = (label: string) =>
    within(table()).getByRole("columnheader", { name: new RegExp(`^${label}(?: Filter by.*)?$`), hidden: true });
  const sortButton = (label: string) => within(header(label)).getByRole("button", { name: label });

  it("sorts every column: descending, ascending, then off", async () => {
    showDialog({ over: { opportunities: BOOK } });
    const before = names();
    for (const label of ["Account ID", "Opportunity Name", "Stage Name", "Subscription Start Date", "API Platform", "Cloud Total"]) {
      await userEvent.click(sortButton(label));
      expect(header(label), `${label} descending`).toHaveAttribute("aria-sort", "descending");
      await userEvent.click(sortButton(label));
      expect(header(label), `${label} ascending`).toHaveAttribute("aria-sort", "ascending");
      await userEvent.click(sortButton(label));
      expect(header(label), `${label} off`).not.toHaveAttribute("aria-sort");
    }
    expect(names()).toEqual(before);
  }, 60_000);

  it("orders the figures as numbers", async () => {
    showDialog({ over: { opportunities: BOOK } });
    await userEvent.click(sortButton("API Platform"));
    expect(names()).toEqual(["Expansion Apac", "renewal west", "Renewal FY26"]);
    await userEvent.click(sortButton("API Platform"));
    expect(names()).toEqual(["Renewal FY26", "renewal west", "Expansion Apac"]);
  });

  it("filters the text columns by what they contain, ignoring case", async () => {
    showDialog({ over: { opportunities: BOOK } });
    await userEvent.click(screen.getByRole("button", { name: /^Filter by Opportunity Name/, hidden: true }));
    await userEvent.type(await screen.findByLabelText("Filter Opportunity Name"), "RENEWAL");
    expect(names()).toEqual(["Renewal FY26", "renewal west"]);
    expect(screen.getByText("2 opportunities")).toBeInTheDocument();
  });

  it("offers no text filter on a figure column", () => {
    showDialog({ over: { opportunities: BOOK } });
    expect(screen.queryByRole("button", { name: /^Filter by API Platform$/, hidden: true })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Filter by Stage Name/, hidden: true })).toBeInTheDocument();
  });

  it("exports the rows as sorted and filtered, in Excel", async () => {
    const { blobs } = captureDownloads();
    showDialog({ over: { opportunities: BOOK } });
    await userEvent.click(screen.getByRole("button", { name: /^Filter by Opportunity Name/, hidden: true }));
    await userEvent.type(await screen.findByLabelText("Filter Opportunity Name"), "renewal");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByLabelText("Filter Opportunity Name")).not.toBeInTheDocument());
    await userEvent.click(sortButton("API Platform"));

    await userEvent.click(screen.getByRole("button", { name: /^export$/i }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /^excel/i }));
    await waitFor(() => expect(blobs).toHaveLength(1));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await bytesOf(blobs[0]));
    const exported: string[] = [];
    workbook.getWorksheet("Opportunities")!.eachRow((row) => exported.push(String(row.getCell(4).value ?? "")));
    expect(exported.filter((name) => /renewal/i.test(name))).toEqual(["renewal west", "Renewal FY26"]);
    expect(exported).not.toContain("Expansion Apac");
  });
});
