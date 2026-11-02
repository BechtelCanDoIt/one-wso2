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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmailNotificationsPage from "./EmailNotificationsPage";

const setting = { data: undefined as unknown, error: null as unknown, isPending: true, isFetching: false, refetch: vi.fn() };
const save = {
  mutate: vi.fn((_on: boolean, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.()),
  reset: vi.fn(),
  isPending: false,
  error: null as unknown,
};

// Mocked so the page is tested without Asgardeo, the network or window.config.
vi.mock("@features/sales/cado2/admin/email-notifications/api/useEmailNotifications", () => ({
  useEmailNotifications: () => setting,
  useSaveEmailNotifications: () => save,
}));

beforeEach(() => {
  save.mutate.mockClear();
});

describe("EmailNotificationsPage (D103)", () => {
  it("turns emails on at once, without asking", async () => {
    Object.assign(setting, {
      isPending: false,
      data: { enabled: false, configured: true, updatedByEmail: null, updatedAt: null },
    });
    render(<EmailNotificationsPage />);
    const toggle = screen.getByRole("switch", { name: "Send approval emails" });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByText(/isn.t set up in this environment/)).toBeNull();

    await userEvent.setup().click(toggle);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(save.mutate).toHaveBeenCalledWith(true, expect.anything());
  });

  it("turns them off, and says who changed it last", async () => {
    Object.assign(setting, {
      isPending: false,
      data: { enabled: true, configured: true, updatedByEmail: "admin@wso2.com", updatedAt: "2026-10-21T10:00:00Z" },
    });
    render(<EmailNotificationsPage />);
    expect(screen.getByText("Last changed 21 Oct 2026 · admin@wso2.com")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("switch", { name: "Send approval emails" }));
    expect(save.mutate).toHaveBeenCalledWith(false, expect.anything());
  });

  it("greys the switch out when the email service isn't set up", () => {
    Object.assign(setting, {
      isPending: false,
      data: { enabled: false, configured: false, updatedByEmail: null, updatedAt: null },
    });
    render(<EmailNotificationsPage />);
    expect(screen.getByText(/isn.t set up in this environment/)).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Send approval emails" })).toBeDisabled();
  });
});
