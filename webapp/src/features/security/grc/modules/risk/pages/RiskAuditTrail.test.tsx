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

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditTrailEntry, AuditTrailPage } from "../api/riskApi";
import RiskAuditTrail from "./RiskAuditTrail";

const authFetch = vi.fn();
vi.mock("@features/security/grc/shim/useAuthApiClient", () => ({
  useAuthApiClient: () => authFetch,
}));
vi.mock("@features/security/grc/shim/apiConfig", () => ({ BACKEND_BASE_URL: "http://backend.test" }));

function entry(over: Partial<AuditTrailEntry>): AuditTrailEntry {
  return {
    id: 1,
    risk_id: 7,
    risk_code: "2026-ASG-Q1-001",
    risk_title: "Weak TLS config",
    action: "APPROVE",
    field_changed: null,
    old_value: null,
    new_value: null,
    details: { role: "Compliance", from: "PENDING_COMPLIANCE_REVIEW", to: "APPROVED" },
    created_by: "uuid-1",
    created_by_email: "carol@wso2.com",
    created_at: "2026-10-01T10:00:00Z",
    ...over,
  };
}

function respond(page: Partial<AuditTrailPage>) {
  authFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ items: [], total: 0, offset: 0, limit: 25, ...page }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function renderTab() {
  return render(
    <MemoryRouter>
      <RiskAuditTrail />
    </MemoryRouter>,
  );
}

function lastUrl(): URL {
  const calls = authFetch.mock.calls;
  return new URL(calls[calls.length - 1][0] as string);
}

describe("RiskAuditTrail", () => {
  beforeEach(() => authFetch.mockReset());

  it("lists changes with the risk, the actor and a readable description", async () => {
    respond({
      total: 2,
      items: [
        entry({}),
        entry({ id: 2, action: "ESCALATE", created_by: "system", created_by_email: undefined, details: {} }),
      ],
    });
    renderTab();

    expect(await screen.findByText("Approved by Compliance")).toBeInTheDocument();
    expect(screen.getAllByText("2026-ASG-Q1-001")).toHaveLength(2);
    expect(screen.getByText("carol@wso2.com")).toBeInTheDocument();
    // The daily job's sentinel actor reads as "System", not a raw id.
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(lastUrl().pathname).toBe("/api/v1/risks/audit-trail");
    expect(lastUrl().searchParams.get("limit")).toBe("25");
    expect(lastUrl().searchParams.get("offset")).toBe("0");
  });

  it("names the actor, falling back to the email, then the id", async () => {
    respond({
      total: 4,
      items: [
        entry({ id: 1, created_by: "u-1", created_by_name: "Alex Actor", created_by_email: "alex@wso2.com" }),
        entry({ id: 2, created_by: "u-2", created_by_name: undefined, created_by_email: "bea@wso2.com" }),
        entry({ id: 3, created_by: "uuid-only", created_by_name: undefined, created_by_email: undefined }),
        entry({ id: 4, created_by: "risk-sheet-migration", created_by_name: undefined, created_by_email: undefined }),
      ],
    });
    renderTab();

    expect(await screen.findByText("Alex Actor")).toBeInTheDocument();
    expect(screen.getByText("bea@wso2.com")).toBeInTheDocument();
    expect(screen.getByText("uuid-only")).toBeInTheDocument();
    // The migration tool's marker is named, not shown raw.
    expect(screen.getByText("Risk sheet migration")).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    respond({});
    renderTab();
    expect(await screen.findByText("No changes recorded yet.")).toBeInTheDocument();
  });

  it("shows the error and retries", async () => {
    authFetch.mockResolvedValueOnce(new Response("boom", { status: 500 }));
    renderTab();
    const retry = await screen.findByRole("button", { name: "Retry" });

    respond({ total: 1, items: [entry({})] });
    await userEvent.click(retry);

    expect(await screen.findByText("Approved by Compliance")).toBeInTheDocument();
  });

  it("drops the previous rows and pagination when a filtered request fails", async () => {
    respond({ total: 60, items: [entry({})] });
    renderTab();
    await screen.findByText("Approved by Compliance");

    authFetch.mockResolvedValueOnce(new Response("boom", { status: 500 }));
    await userEvent.type(screen.getByLabelText("From"), "2026-10-01");

    expect(await screen.findByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("Approved by Compliance")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next page/i })).not.toBeInTheDocument();
  });

  it("sends the date filter and returns to the first page", async () => {
    respond({ total: 60, items: [entry({})] });
    renderTab();
    await screen.findByText("Approved by Compliance");

    respond({ total: 60, items: [entry({ id: 2 })] });
    await userEvent.click(screen.getByRole("button", { name: /next page/i }));
    await waitFor(() => expect(lastUrl().searchParams.get("offset")).toBe("25"));

    respond({ total: 1, items: [entry({ id: 3 })] });
    await userEvent.type(screen.getByLabelText("From"), "2026-10-01");

    await waitFor(() => expect(lastUrl().searchParams.get("from")).toBe("2026-10-01"));
    expect(lastUrl().searchParams.get("offset")).toBe("0");
  });
});
