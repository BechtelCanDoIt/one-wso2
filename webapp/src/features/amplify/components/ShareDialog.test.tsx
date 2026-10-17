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
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpError } from "@api/http";
import type { ConnectionStatus } from "../api/amplifyTypes";
import ShareDialog from "./ShareDialog";

vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
const showSuccess = vi.fn();
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess, showError: vi.fn(), showWarning: vi.fn() }),
}));

const shareCampaign = vi.fn();
vi.mock("../api/amplifyClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/amplifyClient")>()),
  shareCampaign: (...args: unknown[]) => shareCampaign(...args),
}));

const problem = (status: number, code: string) =>
  new HttpError("https://amplify/campaigns/c-1/shares", status, JSON.stringify({ type: "t", title: "t", status, code }));

const campaign = { id: "c-1", title: "Launch week" };

function renderDialog(props: Partial<React.ComponentProps<typeof ShareDialog>> & { status?: ConnectionStatus } = {}) {
  const onNeedConnect = vi.fn();
  const onShared = vi.fn();
  const { status = "ACTIVE", ...rest } = props;
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <ShareDialog
        open
        campaign={campaign}
        linkedInStatus={status}
        onClose={() => {}}
        onNeedConnect={onNeedConnect}
        onShared={onShared}
        {...rest}
      />
    </QueryClientProvider>,
  );
  return { onNeedConnect, onShared };
}

async function pickKind(label: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: "How" }));
  await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: label }));
}

const keyOf = (call: number) => shareCampaign.mock.calls[call][3] as string;

beforeEach(() => {
  shareCampaign.mockReset();
  showSuccess.mockReset();
});

describe("ShareDialog", () => {
  it("offers the four contract kinds and says it posts on your LinkedIn", async () => {
    renderDialog();
    expect(screen.getByText(/posts on your LinkedIn/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("combobox", { name: "How" }));
    expect(within(screen.getByRole("listbox")).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Repost",
      "Repost with your thoughts",
      "Share",
      "Share with your thoughts",
    ]);
  });

  it("requires commentary for the *_COMMENTARY kinds and drops it for the others", async () => {
    shareCampaign.mockResolvedValue({});
    const user = userEvent.setup();
    renderDialog();
    await pickKind("Share with your thoughts");
    expect(screen.getByRole("button", { name: "Share" })).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: /Your thoughts/ }), "  Proud of the team  ");
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(shareCampaign).toHaveBeenCalledWith(
      "token",
      "c-1",
      { kind: "SHARE_COMMENTARY", commentary: "Proud of the team" },
      expect.any(String),
    );

    shareCampaign.mockClear();
    await pickKind("Repost");
    await user.click(screen.getByRole("button", { name: "Share" }));
    // COMMENTARY_NOT_ALLOWED otherwise.
    expect(shareCampaign.mock.calls[0][2]).toEqual({ kind: "REPOST", commentary: undefined });
  });

  it("shares while EXPIRING (the token still works) and shows a non-blocking reconnect banner", async () => {
    shareCampaign.mockResolvedValue({});
    const { onNeedConnect, onShared } = renderDialog({ status: "EXPIRING", linkedInExpiresAt: "2026-10-20T00:00:00Z" });
    expect(screen.getByText(/connection expires/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Share" }));
    expect(shareCampaign).toHaveBeenCalledTimes(1);
    expect(onNeedConnect).not.toHaveBeenCalled();
    await waitFor(() => expect(onShared).toHaveBeenCalled());
  });

  it("the EXPIRING banner's Reconnect routes into the connect flow with the share kept", async () => {
    const { onNeedConnect } = renderDialog({ status: "EXPIRING" });
    await userEvent.setup().click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onNeedConnect).toHaveBeenCalledWith(expect.objectContaining({ campaignId: "c-1", kind: "REPOST" }));
  });

  it.each(["NOT_CONNECTED", "NEEDS_RECONNECT", "REMOVED"] as const)(
    "routes %s through the connect flow without calling the API",
    async (status) => {
      const { onNeedConnect } = renderDialog({ status });
      await userEvent.setup().click(screen.getByRole("button", { name: "Share" }));
      expect(onNeedConnect).toHaveBeenCalledTimes(1);
      expect(shareCampaign).not.toHaveBeenCalled();
    },
  );

  it("lets the server decide right after a connect, before /me catches up", async () => {
    shareCampaign.mockResolvedValue({});
    const { onNeedConnect } = renderDialog({ status: "NOT_CONNECTED", skipConnectionCheck: true });
    await userEvent.setup().click(screen.getByRole("button", { name: "Share" }));
    expect(shareCampaign).toHaveBeenCalledTimes(1);
    expect(onNeedConnect).not.toHaveBeenCalled();
  });

  it("routes a NEEDS_RECONNECT answer into the connect flow", async () => {
    shareCampaign.mockRejectedValue(problem(409, "NEEDS_RECONNECT"));
    const { onNeedConnect } = renderDialog();
    await userEvent.setup().click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(onNeedConnect).toHaveBeenCalledTimes(1));
  });

  describe("idempotency key", () => {
    it("reuses the key when the same share is retried after a 5xx", async () => {
      shareCampaign.mockRejectedValueOnce(problem(503, "DEPENDENCY_UNAVAILABLE")).mockResolvedValueOnce({});
      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByRole("button", { name: "Share" }));
      await screen.findByRole("alert");
      await user.click(screen.getByRole("button", { name: "Share" }));
      expect(shareCampaign).toHaveBeenCalledTimes(2);
      expect(keyOf(1)).toBe(keyOf(0));
    });

    it("mints a new key when the commentary changes (else IDEMPOTENCY_KEY_REUSED)", async () => {
      shareCampaign.mockRejectedValue(new TypeError("Failed to fetch"));
      const user = userEvent.setup();
      renderDialog();
      await pickKind("Repost with your thoughts");
      const box = screen.getByRole("textbox", { name: /Your thoughts/ });
      await user.type(box, "first");
      await user.click(screen.getByRole("button", { name: "Share" }));
      await screen.findByRole("alert");
      await user.type(box, " and more");
      await user.click(screen.getByRole("button", { name: "Share" }));
      expect(keyOf(1)).not.toBe(keyOf(0));
    });

    it("mints a new key after a 4xx, which the server stored against the old one", async () => {
      shareCampaign.mockRejectedValueOnce(problem(422, "COMMENTARY_TOO_LONG")).mockResolvedValueOnce({});
      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByRole("button", { name: "Share" }));
      await screen.findByRole("alert");
      await user.click(screen.getByRole("button", { name: "Share" }));
      expect(keyOf(1)).not.toBe(keyOf(0));
    });
  });
});
