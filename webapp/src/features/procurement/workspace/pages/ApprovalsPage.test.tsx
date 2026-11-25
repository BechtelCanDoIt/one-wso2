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
import type { ApprovalItem } from "../../types";
import ApprovalsPage from "./ApprovalsPage";

const item = (id: string): ApprovalItem => ({
  id,
  reference: `PR-2026-0000${id}`,
  title: `Title ${id}`,
  category: "NON-IT",
  status: "submitted",
  requester: { id: "alex@example.com", name: "Alex Morgan", email: "alex@example.com" },
  submittedAt: "2026-10-28T09:12:00.000Z",
  updatedAt: "2026-10-28T09:12:00.000Z",
});

const asked = vi.hoisted(() => vi.fn());
vi.mock("../../api/useProcurement", () => ({
  useApprovals: (status?: string) => {
    asked(status);
    return { data: status === "rejected" ? [] : [item("1"), item("2")], isPending: false, isError: false };
  },
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/procurement/approvals"]}>
      <Routes>
        <Route path="/procurement/approvals" element={<ApprovalsPage />} />
        <Route path="/procurement/approvals/:requestId" element={<h1>Review page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ApprovalsPage", () => {
  it("lists the requests waiting for the user, with who raised each", () => {
    asked.mockClear();
    renderPage();
    expect(asked).toHaveBeenCalledWith(undefined);
    expect(screen.getAllByText("Alex Morgan")).toHaveLength(2);
    expect(screen.getByText("PR-2026-00001")).toBeInTheDocument();
  });

  it("opens the review page from a click anywhere on the row", async () => {
    renderPage();
    await userEvent.setup().click(screen.getByText("Title 2"));
    expect(screen.getByRole("heading", { name: "Review page" })).toBeInTheDocument();
  });

  it("asks for another status when a chip is picked, and says so when there are none", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Rejected" }));
    expect(asked).toHaveBeenLastCalledWith("rejected");
    expect(screen.getByText("No requests with this status")).toBeInTheDocument();
  });
});
