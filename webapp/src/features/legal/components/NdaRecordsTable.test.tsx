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
import type { NdaRecord } from "@features/legal/api/useNdaRecords";
import NdaRecordsTable from "@features/legal/components/NdaRecordsTable";

type RecordsQuery = {
  data?: { items: NdaRecord[]; total: number; days: number | null; maxDays: number | null };
  isPlaceholderData?: boolean;
  isPending: boolean;
  isError: boolean;
  isFetching?: boolean;
  error?: unknown;
  refetch?: () => void;
};
const query = vi.hoisted(() => ({
  value: {} as RecordsQuery,
  calls: [] as { page: number; days: number | null }[],
}));
vi.mock("@features/legal/api/useNdaRecords", () => ({
  useNdaRecords: (page: number, _size: number, _enabled: boolean, days: number | null) => {
    query.calls.push({ page, days });
    return query.value;
  },
}));

const RECORD: NdaRecord = {
  id: 7,
  generatedAt: "2026-10-29T04:30:00Z",
  generatedByEmail: "jane@wso2.com",
  template: "Mutual NDA \u2014 Standard",
  wso2Entity: "WSO2 (UK) Ltd \u2014 UK",
  counterpartyName: "Example Vendor Ltd",
  counterpartyAddress: "1 Example Road, London, United Kingdom",
  counterpartyCountry: "United Kingdom",
  source: "manual",
  salesforceAccountId: null,
};

describe("NdaRecordsTable", () => {
  it("lists who generated each NDA, for whom and with which WSO2 company", () => {
    query.value = { data: { items: [RECORD], total: 1, days: 7, maxDays: 30 }, isPending: false, isError: false };
    render(<NdaRecordsTable />);

    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByText("jane@wso2.com")).toBeInTheDocument();
    expect(within(row).getByText("Example Vendor Ltd")).toBeInTheDocument();
    expect(within(row).getByText("1 Example Road, London, United Kingdom")).toBeInTheDocument();
    expect(within(row).getByText("WSO2 (UK) Ltd (UK)")).toBeInTheDocument();
    expect(within(row).getByText("Manual entry")).toBeInTheDocument();
    expect(within(row).getByText(new Date(RECORD.generatedAt).toLocaleString())).toBeInTheDocument();
  });

  it("says how far back the list goes", () => {
    query.value = { data: { items: [RECORD], total: 1, days: 7, maxDays: 30 }, isPending: false, isError: false };
    render(<NdaRecordsTable />);
    expect(screen.getByText("NDAs generated in the last 7 days, newest first.")).toBeInTheDocument();
  });

  it("says when nothing was generated in that period", () => {
    query.value = { data: { items: [], total: 0, days: 1, maxDays: 30 }, isPending: false, isError: false };
    render(<NdaRecordsTable />);
    expect(screen.getByText("No NDAs have been generated in the last day.")).toBeInTheDocument();
  });

  it("offers a retry when the records can't be loaded", () => {
    query.value = { isPending: false, isError: true, error: new Error("boom"), refetch: vi.fn() };
    render(<NdaRecordsTable />);
    expect(screen.getByText(/Couldn't load the NDA records/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("NdaRecordsTable period", () => {
  it("starts on the backend's default and asks for the period chosen", async () => {
    const user = userEvent.setup();
    query.calls = [];
    query.value = { data: { items: [RECORD], total: 1, days: 7, maxDays: 30 }, isPending: false, isError: false };
    render(<NdaRecordsTable />);

    const period = screen.getByRole("combobox", { name: "Period" });
    expect(period).toHaveTextContent("Last 7 days");
    expect(query.calls[0]).toEqual({ page: 0, days: null });

    await user.click(period);
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Last day", "Last 3 days", "Last 7 days", "Last 30 days"]);

    await user.click(screen.getByRole("option", { name: "Last 3 days" }));
    expect(query.calls.at(-1)).toEqual({ page: 0, days: 3 });
  });

  it("offers nothing longer than the backend's maximum", async () => {
    const user = userEvent.setup();
    query.value = { data: { items: [RECORD], total: 1, days: 7, maxDays: 7 }, isPending: false, isError: false };
    render(<NdaRecordsTable />);

    await user.click(screen.getByRole("combobox", { name: "Period" }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Last day", "Last 3 days", "Last 7 days"]);
  });
});
