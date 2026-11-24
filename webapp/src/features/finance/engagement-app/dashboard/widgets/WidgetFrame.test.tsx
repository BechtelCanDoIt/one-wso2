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

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { Dashboard } from "../../api/engagementTypes";
import { widgetById } from "./registry";
import type { DashboardSectionKey, SectionState, WidgetCtx } from "./types";
import WidgetFrame from "./WidgetFrame";

const query = (q: object) => ({ isPending: false, isError: false, isFetching: false, isPlaceholderData: false, refetch: vi.fn(), ...q }) as never;

function ctx(over: { section?: (k: DashboardSectionKey) => SectionState; dashboard?: Dashboard; cost?: object; exportCsv?: () => Promise<void> } = {}): WidgetCtx {
  return {
    today: "2026-11-24",
    dashboard: over.dashboard,
    section: over.section ?? (() => ({ status: "loaded" })),
    retry: vi.fn(),
    retrying: false,
    allocationsToday: { businessUnit: "", date: "", query: query({}), change: () => undefined },
    cost: { view: { mode: "charts" }, drill: () => undefined, query: query(over.cost ?? {}), exportCsv: over.exportCsv ?? (() => Promise.resolve()) } as never,
  };
}

function frame(id: string, c: WidgetCtx, extra: { pinned?: boolean; exporting?: boolean; onExport?: () => void; onHide?: () => void; onPin?: () => void } = {}) {
  return render(
    <MemoryRouter>
      <WidgetFrame def={widgetById(id)!} ctx={c} pinned={extra.pinned ?? false} exporting={extra.exporting ?? false} onExport={extra.onExport ?? (() => undefined)} onHide={extra.onHide ?? (() => undefined)} onPin={extra.onPin ?? (() => undefined)} />
    </MemoryRouter>,
  );
}

describe("WidgetFrame", () => {
  it("is a section named by its heading", () => {
    frame("waiting-on-you", ctx({ dashboard: { failed: [], queue: [{ key: "k", label: "To approve", count: 2, highlighted: true }] } }));
    expect(screen.getByRole("region", { name: "Waiting on You" })).toBeTruthy();
    expect(screen.getByText("To approve")).toBeTruthy();
  });

  it("shows a busy skeleton while its data loads", () => {
    const { container } = frame("tc-source", ctx({ cost: { isPending: true } }));
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText("No travel cost in this period.")).toBeNull();
  });

  it("says it failed and retries its own query", () => {
    const retry = vi.fn();
    frame("tc-source", ctx({ cost: { isError: true, error: new Error("boom"), refetch: retry } }));
    expect(screen.getByText(/Couldn.t load Spend by Source/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(retry).toHaveBeenCalled();
  });

  it("retries the dashboard for a widget whose section failed", () => {
    const c = ctx({ section: () => ({ status: "failed" }) });
    frame("waiting-on-you", c);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(c.retry).toHaveBeenCalledWith("waitingOnYou");
  });

  it("shows its empty text", () => {
    frame("waiting-on-you", ctx({ dashboard: { failed: [] } }));
    expect(screen.getByText("Nothing is waiting on you right now.")).toBeTruthy();
  });

  it("dims its body while a newer answer loads", () => {
    const data = { bySource: [{ key: "invoice", label: "Travel Invoices", value: 5, percent: 100, thin: false, categorised: true }], compare: undefined };
    const { container } = frame("tc-source", ctx({ cost: { data, isPlaceholderData: true } }));
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByText("Travel Invoices")).toBeTruthy();
  });

  it("offers Pin to Top, Hide Widget and, where it has one, Export CSV in its menu", async () => {
    const onHide = vi.fn();
    const onPin = vi.fn();
    const onExport = vi.fn();
    frame("tc-source", ctx({ cost: { isPending: true } }), { onHide, onPin, onExport });
    fireEvent.click(screen.getByRole("button", { name: "More actions for Spend by Source" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Export CSV" }));
    await waitFor(() => expect(onExport).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "More actions for Spend by Source" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Pin to Top" }));
    expect(onPin).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "More actions for Spend by Source" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Hide Widget" }));
    expect(onHide).toHaveBeenCalled();
  });

  it("disables Export CSV while a summary widget still shows the previous period, but not the Transactions export", () => {
    frame("tc-source", ctx({ cost: { isPlaceholderData: true } }));
    fireEvent.click(screen.getByRole("button", { name: "More actions for Spend by Source" }));
    expect(screen.getByRole("menuitem", { name: "Export CSV" }).getAttribute("aria-disabled")).toBe("true");
  });

  it("disables Export CSV while its own export runs", () => {
    frame("tc-source", ctx({}), { exporting: true });
    fireEvent.click(screen.getByRole("button", { name: "More actions for Spend by Source" }));
    expect(screen.getByRole("menuitem", { name: "Exporting…" }).getAttribute("aria-disabled")).toBe("true");
  });

  it("says Unpin for a pinned widget and has no Export CSV where there is nothing to export", () => {
    frame("waiting-on-you", ctx({ dashboard: { failed: [] } }), { pinned: true });
    fireEvent.click(screen.getByRole("button", { name: "More actions for Waiting on You" }));
    expect(screen.getByRole("menuitem", { name: "Unpin" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Export CSV" })).toBeNull();
  });
});
