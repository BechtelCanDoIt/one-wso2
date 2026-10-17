// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpError } from "@api/http";
import PointsAdjustDialog from "./PointsAdjustDialog";

vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));

const adjustPoints = vi.fn();
vi.mock("../api/amplifyClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/amplifyClient")>()),
  adjustPoints: (...args: unknown[]) => adjustPoints(...args),
}));

function renderDialog(open = true) {
  const onClose = vi.fn();
  const client = new QueryClient();
  const ui = (o: boolean) => (
    <QueryClientProvider client={client}>
      <PointsAdjustDialog open={o} employeeId="e-7" employeeName="Ana" onClose={onClose} />
    </QueryClientProvider>
  );
  const view = render(ui(open));
  return {
    onClose,
    reopen: () => {
      view.rerender(ui(false));
      view.rerender(ui(true));
    },
  };
}

const keyOf = (call: number) => adjustPoints.mock.calls[call][2] as string;

beforeEach(() => adjustPoints.mockReset());

describe("PointsAdjustDialog", () => {
  it("sends a signed integer with the trimmed reason", async () => {
    adjustPoints.mockResolvedValue({});
    const user = userEvent.setup();
    const { onClose } = renderDialog();
    const points = screen.getByRole("spinbutton", { name: "Points" });
    await user.clear(points);
    await user.type(points, "-25");
    await user.type(screen.getByRole("textbox", { name: "Reason" }), "  duplicate award ");
    await user.click(screen.getByRole("button", { name: "Adjust" }));
    expect(adjustPoints).toHaveBeenCalledWith(
      "token",
      { employeeId: "e-7", points: -25, reason: "duplicate award" },
      expect.any(String),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("refuses zero, fractions and values past ±10000 before sending", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByRole("textbox", { name: "Reason" }), "x");
    const points = screen.getByRole("spinbutton", { name: "Points" });
    for (const bad of ["0", "1.5", "10001"]) {
      await user.clear(points);
      await user.type(points, bad);
      await user.click(screen.getByRole("button", { name: "Adjust" }));
      expect(screen.getByRole("alert")).toHaveTextContent(/whole, non-zero/);
    }
    expect(adjustPoints).not.toHaveBeenCalled();
  });

  // The double-apply this fixes: the server wrote the row, the reply timed out,
  // the PO clicked again — a fresh key per click made that a second ledger row.
  it("reuses the key when the same adjustment is retried after a timeout", async () => {
    adjustPoints.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce({});
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByRole("textbox", { name: "Reason" }), "bonus");
    await user.click(screen.getByRole("button", { name: "Adjust" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Adjust" }));
    expect(adjustPoints).toHaveBeenCalledTimes(2);
    expect(keyOf(0)).toMatch(/^amplify-/);
    expect(keyOf(1)).toBe(keyOf(0));
  });

  it("mints a new key when the points or reason change", async () => {
    adjustPoints
      .mockRejectedValueOnce(new HttpError("u", 503, "{}"))
      .mockRejectedValueOnce(new HttpError("u", 503, "{}"));
    const user = userEvent.setup();
    renderDialog();
    const reason = screen.getByRole("textbox", { name: "Reason" });
    await user.type(reason, "bonus");
    await user.click(screen.getByRole("button", { name: "Adjust" }));
    await screen.findByRole("alert");
    await user.type(reason, " for launch");
    await user.click(screen.getByRole("button", { name: "Adjust" }));
    expect(keyOf(1)).not.toBe(keyOf(0));
    await waitFor(() => expect(screen.getByRole("button", { name: "Adjust" })).toBeEnabled());
    expect(adjustPoints).toHaveBeenCalledTimes(2);
  });

  it("mints a new key each time the dialog opens", async () => {
    adjustPoints
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    const { reopen } = renderDialog();
    await user.type(screen.getByRole("textbox", { name: "Reason" }), "bonus");
    await user.click(screen.getByRole("button", { name: "Adjust" }));
    await screen.findByRole("alert");
    reopen();
    await user.type(screen.getByRole("textbox", { name: "Reason" }), "bonus");
    await user.click(screen.getByRole("button", { name: "Adjust" }));
    expect(adjustPoints).toHaveBeenCalledTimes(2);
    expect(keyOf(1)).not.toBe(keyOf(0));
    await waitFor(() => expect(screen.getByRole("button", { name: "Adjust" })).toBeEnabled());
  });
});
