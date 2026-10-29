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

// The Marketing Admin gate decides before the admin page mounts, so a non-admin's visit
// never reaches the page — or the settings requests the page would make.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import MarketingAdminRoute from "@features/marketing-ops/components/MarketingAdminRoute";
import type { MarketingOpsGate } from "@features/marketing-ops/api/useMarketingOpsGate";

const configured = vi.hoisted(() => ({ value: true }));
vi.mock("@config/apiConfig", () => ({
  isMarketingOpsBackendConfigured: () => configured.value,
}));

const gate = vi.hoisted(() => ({ value: {} as MarketingOpsGate }));
vi.mock("@features/marketing-ops/api/useMarketingOpsGate", () => ({
  useMarketingOpsGate: () => gate.value,
}));

const ADMIN: MarketingOpsGate = {
  canSee: () => true,
  isAuthorized: true,
  isAdmin: true,
  isResolving: false,
  isError: false,
  retry: () => {},
};

function renderAt(g: Partial<MarketingOpsGate> = {}) {
  gate.value = { ...ADMIN, ...g };
  return render(
    <MemoryRouter initialEntries={["/marketing-ops/admin/events-notifications"]}>
      <Routes>
        <Route path="/marketing-ops/admin" element={<MarketingAdminRoute />}>
          <Route path="events-notifications" element={<div>the admin page</div>} />
        </Route>
        <Route path="/marketing-ops" element={<div>the landing</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  configured.value = true;
});

describe("MarketingAdminRoute", () => {
  it("shows the page to an admin", () => {
    renderAt();
    expect(screen.getByText("the admin page")).toBeInTheDocument();
  });

  it("sends an authorized non-admin back to the landing, without mounting the page", () => {
    renderAt({ isAdmin: false });
    expect(screen.getByText("the landing")).toBeInTheDocument();
    expect(screen.queryByText("the admin page")).not.toBeInTheDocument();
  });

  it("holds the page, rather than refusing, while the access check is in flight", () => {
    renderAt({ isAdmin: false, isResolving: true });
    expect(screen.queryByText("the admin page")).not.toBeInTheDocument();
    expect(screen.queryByText("the landing")).not.toBeInTheDocument();
  });

  it("offers a retry, not a refusal, when the access check fails", () => {
    renderAt({ isAdmin: false, isError: true, errorMessage: "Gateway timeout." });
    expect(screen.getByText(/Couldn.t check your Marketing Ops access/)).toBeInTheDocument();
    expect(screen.queryByText("the landing")).not.toBeInTheDocument();
  });

  it("lets the page's own shell explain a missing backend URL", () => {
    configured.value = false;
    renderAt({ isAdmin: false });
    expect(screen.getByText("the admin page")).toBeInTheDocument();
  });
});
