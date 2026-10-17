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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AmplifyGate } from "../api/useAmplifyGate";
import type { ConnectionStatus } from "../api/amplifyTypes";
import AmplifyShareButton from "./AmplifyShareButton";
import {
  clearConnectResult,
  clearPendingShare,
  CONNECT_RESULT_STORAGE_KEY,
  CONNECT_RETURN_TO_PATTERN,
  connectReturnTo,
  loadPendingShare,
  saveConnectResult,
  savePendingShare,
} from "./shareFlow";

vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));

const startLinkedInConnect = vi.fn();
const shareCampaign = vi.fn();
vi.mock("../api/amplifyClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/amplifyClient")>()),
  startLinkedInConnect: (...args: unknown[]) => startLinkedInConnect(...args),
  shareCampaign: (...args: unknown[]) => shareCampaign(...args),
}));

function makeGate(status: ConnectionStatus): AmplifyGate {
  return {
    canSee: () => true,
    isAuthorized: true,
    isPo: false,
    isMarketing: false,
    isSlt: false,
    isAdmin: false,
    isResolving: false,
    isError: false,
    me: {
      employee: { employee_id: "e1", email: "a@wso2.com", display_name: "A" },
      roles: [],
      capabilities: [],
      linkedin: { status },
    },
    retry: vi.fn(),
  };
}

const A = { id: "c-a", title: "Campaign A" };
const B = { id: "c-b", title: "Campaign B" };

function renderButtons(status: ConnectionStatus = "NOT_CONNECTED") {
  const gate = makeGate(status);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AmplifyShareButton campaign={A} gate={gate} />
      <AmplifyShareButton campaign={B} gate={gate} />
    </QueryClientProvider>,
  );
  return gate;
}

/** What the callback tab does: write the result, which fires `storage` here. */
function connectTabFinishes(status: "ok" | "error", message?: string) {
  saveConnectResult({ status, message });
  act(() => {
    window.dispatchEvent(
      new StorageEvent("storage", { key: CONNECT_RESULT_STORAGE_KEY, newValue: window.localStorage.getItem(CONNECT_RESULT_STORAGE_KEY) }),
    );
  });
}

let openSpy: ReturnType<typeof vi.spyOn>;
let tab: { opener: unknown; location: { href: string }; close: ReturnType<typeof vi.fn> };

beforeEach(() => {
  tab = { opener: {}, location: { href: "about:blank" }, close: vi.fn() };
  openSpy = vi.spyOn(window, "open").mockImplementation(() => tab as unknown as Window);
  startLinkedInConnect.mockReset().mockResolvedValue({
    authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization?state=s",
    state: "s",
    expiresAt: "2026-10-17T00:10:00Z",
  });
  shareCampaign.mockReset();
});

afterEach(() => {
  openSpy.mockRestore();
  clearPendingShare();
  clearConnectResult();
});

async function startShareOnA(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: "Amplify" })[0]);
  await user.click(screen.getByRole("button", { name: "Share" }));
  await screen.findByText("Connect LinkedIn to amplify");
}

describe("AmplifyShareButton connect flow", () => {
  it("opens the consent tab synchronously in the click, then points it at LinkedIn", async () => {
    const user = userEvent.setup();
    renderButtons();
    await startShareOnA(user);
    await user.click(screen.getByRole("button", { name: "Connect LinkedIn" }));
    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    await waitFor(() => expect(tab.location.href).toMatch(/^https:\/\/www\.linkedin\.com\/oauth/));
    expect(tab.opener).toBeNull();
    // No false "blocked" error now that the handle is real.
    expect(screen.queryByText(/blocked/)).toBeNull();
    expect(startLinkedInConnect).toHaveBeenCalledWith("token", expect.objectContaining({ pendingCampaignId: "c-a" }));
    expect(loadPendingShare()?.campaignId).toBe("c-a");
  });

  it("sends a returnTo that matches the server's ConnectStart pattern", async () => {
    const user = userEvent.setup();
    renderButtons();
    await startShareOnA(user);
    await user.click(screen.getByRole("button", { name: "Connect LinkedIn" }));
    await waitFor(() => expect(startLinkedInConnect).toHaveBeenCalled());
    const body = startLinkedInConnect.mock.calls[0][1] as { returnTo: string };
    expect(body.returnTo).toMatch(CONNECT_RETURN_TO_PATTERN);
    expect(body.returnTo).toBe(connectReturnTo(window.location.pathname));
  });

  it("shows the blocked error only when the browser really blocked the tab", async () => {
    openSpy.mockImplementation(() => null);
    const user = userEvent.setup();
    renderButtons();
    await startShareOnA(user);
    await user.click(screen.getByRole("button", { name: "Connect LinkedIn" }));
    expect(await screen.findByText(/blocked the LinkedIn window/)).toBeInTheDocument();
    expect(startLinkedInConnect).not.toHaveBeenCalled();
  });

  it("closes the blank tab and shows the error when the start call fails", async () => {
    startLinkedInConnect.mockRejectedValueOnce(new Error("Amplify is unavailable"));
    const user = userEvent.setup();
    renderButtons();
    await startShareOnA(user);
    await user.click(screen.getByRole("button", { name: "Connect LinkedIn" }));
    expect(await screen.findByText("Amplify is unavailable")).toBeInTheDocument();
    expect(tab.close).toHaveBeenCalled();
  });

  it("reopens ONLY the interrupted campaign's dialog when the connect tab reports back", async () => {
    const user = userEvent.setup();
    const gate = renderButtons();
    await startShareOnA(user);
    await user.click(screen.getByRole("button", { name: "Connect LinkedIn" }));
    await waitFor(() => expect(tab.location.href).toMatch(/linkedin/));

    connectTabFinishes("ok");

    expect(await screen.findByText("Amplify “Campaign A”")).toBeInTheDocument();
    expect(screen.queryByText("Amplify “Campaign B”")).toBeNull();
    // The connect prompt closes (after its exit transition).
    await waitFor(() => expect(screen.queryByText("Connect LinkedIn to amplify")).toBeNull());
    expect(gate.retry).toHaveBeenCalled();
  });

  it("the resumed dialog lets the server decide even before /me reads ACTIVE", async () => {
    shareCampaign.mockResolvedValue({});
    savePendingShare({ campaignId: "c-a", kind: "REPOST", returnTo: "/amplify/posts" });
    renderButtons("NOT_CONNECTED");
    connectTabFinishes("ok");
    await screen.findByText("Amplify “Campaign A”");
    await userEvent.setup().click(screen.getByRole("button", { name: "Share" }));
    expect(shareCampaign).toHaveBeenCalledTimes(1);
  });

  it("resumes after a reload of this tab (result already written)", async () => {
    savePendingShare({ campaignId: "c-b", kind: "SHARE_COMMENTARY", commentary: "kept", returnTo: "/amplify/posts" });
    saveConnectResult({ status: "ok" });
    renderButtons();
    expect(await screen.findByText("Amplify “Campaign B”")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Your thoughts/ })).toHaveValue("kept");
    expect(screen.queryByText("Amplify “Campaign A”")).toBeNull();
  });

  it("ignores a stale pending share", async () => {
    savePendingShare({ campaignId: "c-a", kind: "REPOST", returnTo: "/amplify/posts" }, Date.now() - 31 * 60 * 1000);
    saveConnectResult({ status: "ok" });
    renderButtons();
    await act(async () => {});
    expect(screen.queryByText("Amplify “Campaign A”")).toBeNull();
  });

  it("surfaces a failed connect on the matching button and drops the pending share", async () => {
    savePendingShare({ campaignId: "c-a", kind: "REPOST", returnTo: "/amplify/posts" });
    renderButtons();
    connectTabFinishes("error", "You cancelled the LinkedIn sign-in.");
    expect(await screen.findByText("You cancelled the LinkedIn sign-in.")).toBeInTheDocument();
    expect(loadPendingShare()).toBeNull();
  });

  it("goes straight to sharing for an EXPIRING connection", async () => {
    shareCampaign.mockResolvedValue({});
    const user = userEvent.setup();
    renderButtons("EXPIRING");
    await user.click(screen.getAllByRole("button", { name: "Amplify" })[0]);
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(shareCampaign).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Connect LinkedIn to amplify")).toBeNull();
  });
});
