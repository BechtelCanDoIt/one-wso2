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
import { MemoryRouter, Route, Routes } from "react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PurchaseRequest } from "../types";
import MyRequestsPage from "./MyRequestsPage";

const request = (id: string, reference: string): PurchaseRequest =>
  ({
    id,
    reference,
    title: `Title ${reference}`,
    category: "IT",
    status: "submitted",
    teamLead: { id: "u-2", name: "Jordan Ellis", email: "jordan.ellis@example.com" },
    submittedAt: "2026-10-28T09:12:00.000Z",
  }) as PurchaseRequest;

vi.mock("../api/useProcurement", () => ({
  useMyRequests: () => ({ data: [request("a", "PR-2026-0002"), request("b", "PR-2026-0001")], isPending: false, isError: false }),
}));
vi.mock("../components/ProcurementShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/finance/procurement/requests"]}>
      <Routes>
        <Route path="/finance/procurement/requests" element={<MyRequestsPage />} />
        <Route path="/finance/procurement/requests/:requestId" element={<h1>Detail page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MyRequestsPage rows", () => {
  it("open the request when the row is clicked anywhere", async () => {
    renderPage();
    await userEvent.setup().click(screen.getByText("Title PR-2026-0001"));
    expect(screen.getByRole("heading", { name: "Detail page" })).toBeInTheDocument();
  });

  it("open the request from the reference link too, without underlining it", async () => {
    renderPage();
    const link = screen.getByRole("link", { name: "PR-2026-0002" });
    expect(getComputedStyle(link).textDecorationLine).not.toBe("underline");
    await userEvent.setup().click(link);
    expect(screen.getByRole("heading", { name: "Detail page" })).toBeInTheDocument();
  });
});
