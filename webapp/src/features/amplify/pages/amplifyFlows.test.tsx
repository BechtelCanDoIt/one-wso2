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
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpError } from "@api/http";
import AmplifyPeriodPicker from "../components/AmplifyPeriodPicker";
import { AMPLIFY_PERIOD_PATTERN } from "../components/amplifyUi";
import {
  clearConnectResult,
  clearPendingShare,
  consumeConnectResult,
  OAUTH_REDIRECT_MISMATCH_MESSAGE,
  savePendingShare,
} from "../components/shareFlow";

vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));
vi.mock("@config/apiConfig", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@config/apiConfig")>()),
  isAmplifyBackendConfigured: () => true,
}));
vi.mock("../api/useAmplifyGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/useAmplifyGate")>()),
  useAmplifyGate: () => ({
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
      linkedin: { status: "ACTIVE" },
    },
    retry: vi.fn(),
  }),
}));
vi.mock("../api/amplifyHooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/amplifyHooks")>();
  const empty = () => ({ data: { items: [] }, isPending: false, isError: false, error: null, refetch: vi.fn() });
  return { ...actual, useAmplifyCampaigns: empty, useAmplifyMyExternalShares: empty };
});

const completeLinkedInConnect = vi.fn();
const claimExternalShare = vi.fn();
vi.mock("../api/amplifyClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/amplifyClient")>()),
  completeLinkedInConnect: (...args: unknown[]) => completeLinkedInConnect(...args),
  claimExternalShare: (...args: unknown[]) => claimExternalShare(...args),
}));

const { default: AmplifyConnectCallbackPage } = await import("./AmplifyConnectCallbackPage");
const { default: AmplifyMyCampaignPage } = await import("./AmplifyMyCampaignPage");

function renderAt(ui: React.ReactNode, url = "/") {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

// The callback page closes its own tab ~1.2s after success; in jsdom that
// would tear down the document under whichever test runs next.
let closeSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  completeLinkedInConnect.mockReset();
  claimExternalShare.mockReset();
  closeSpy = vi.spyOn(window, "close").mockImplementation(() => {});
});
afterEach(() => {
  closeSpy.mockRestore();
  clearPendingShare();
  clearConnectResult();
});

describe("the connect callback", () => {
  it("renders fixed copy for LinkedIn's error, never the raw parameter", async () => {
    renderAt(<AmplifyConnectCallbackPage />, "/amplify/connect/callback?error=%3Cb%3Ehi%3C%2Fb%3E&error_description=evil");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn't complete the connection/);
    expect(alert.textContent).not.toContain("<b>");
    expect(alert.textContent).not.toContain("evil");
    expect(consumeConnectResult()).toMatchObject({ status: "error" });
  });

  it("maps a cancelled login to its own copy", async () => {
    renderAt(<AmplifyConnectCallbackPage />, "/amplify/connect/callback?error=user_cancelled_login");
    expect(await screen.findByRole("alert")).toHaveTextContent(/cancelled the LinkedIn sign-in/);
  });

  it("refuses an off-site returnTo from storage", async () => {
    savePendingShare({ campaignId: "c-1", kind: "REPOST", returnTo: "//evil.example/x" });
    renderAt(<AmplifyConnectCallbackPage />, "/amplify/connect/callback?error=access_denied");
    const back = await screen.findByRole("link", { name: "Back to Amplify" });
    expect(back).toHaveAttribute("href", "/amplify/posts");
  });

  it("keeps a same-origin returnTo and writes an ok result on success", async () => {
    completeLinkedInConnect.mockResolvedValue({ status: "ACTIVE", memberUrn: "m", connectedAt: "x", expiresAt: "y" });
    savePendingShare({ campaignId: "c-1", kind: "REPOST", returnTo: "/amplify/leaderboard" });
    renderAt(<AmplifyConnectCallbackPage />, "/amplify/connect/callback?code=abc&state=" + "s".repeat(32));
    expect(await screen.findByRole("link", { name: "Back to Amplify" })).toHaveAttribute("href", "/amplify/leaderboard");
    expect(completeLinkedInConnect).toHaveBeenCalledWith("token", {
      code: "abc",
      state: "s".repeat(32),
      redirectUri: window.location.origin + window.location.pathname,
    });
    expect(consumeConnectResult()).toMatchObject({ status: "ok" });
    await waitFor(() => expect(closeSpy).toHaveBeenCalled(), { timeout: 3000 });
  });

  describe("redirectUri", () => {
    const originalUrl = window.location.href;
    afterEach(() => window.history.replaceState(null, "", originalUrl));

    it("sends the callback page's own URL, without query or fragment", async () => {
      completeLinkedInConnect.mockResolvedValue({ status: "ACTIVE", memberUrn: "m", connectedAt: "x", expiresAt: "y" });
      const query = "?code=abc&state=" + "s".repeat(32);
      window.history.replaceState(null, "", "/amplify/connect/callback" + query + "#frag");
      renderAt(<AmplifyConnectCallbackPage />, "/amplify/connect/callback" + query);
      await screen.findByRole("link", { name: "Back to Amplify" });
      const body = completeLinkedInConnect.mock.calls[0][1] as { redirectUri: string };
      expect(body.redirectUri).toBe(`${window.location.origin}/amplify/connect/callback`);
      expect(body.redirectUri).not.toMatch(/[?#]/);
    });

    it("maps 422 OAUTH_REDIRECT_MISMATCH to fixed copy and reports it to the origin tab", async () => {
      completeLinkedInConnect.mockRejectedValue(
        new HttpError(
          "https://amplify/connections/linkedin/complete",
          422,
          JSON.stringify({
            type: "urn:wso2:amplify:problem:OAUTH_REDIRECT_MISMATCH",
            title: "Redirect mismatch",
            status: 422,
            code: "OAUTH_REDIRECT_MISMATCH",
            message: "redirect_uri https://evil.example differs",
          }),
        ),
      );
      renderAt(<AmplifyConnectCallbackPage />, "/amplify/connect/callback?code=abc&state=" + "s".repeat(32));
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(OAUTH_REDIRECT_MISMATCH_MESSAGE);
      expect(alert.textContent).not.toContain("evil.example");
      expect(consumeConnectResult()).toMatchObject({ status: "error", message: OAUTH_REDIRECT_MISMATCH_MESSAGE });
      expect(closeSpy).not.toHaveBeenCalled();
    });

    it("still uses the server's message for other failures", async () => {
      completeLinkedInConnect.mockRejectedValue(
        new HttpError("u", 400, JSON.stringify({ status: 400, code: "OAUTH_STATE_INVALID", message: "State expired." })),
      );
      renderAt(<AmplifyConnectCallbackPage />, "/amplify/connect/callback?code=abc&state=" + "s".repeat(32));
      expect(await screen.findByRole("alert")).toHaveTextContent("State expired.");
      expect(consumeConnectResult()).toMatchObject({ status: "error", message: "State expired." });
    });
  });
});

describe("AmplifyPeriodPicker wire values", () => {

  it.each([
    ["All time", "ALL"],
    ["A month…", /^\d{4}-(0[1-9]|1[0-2])$/],
    ["A quarter…", /^\d{4}-Q[1-4]$/],
  ] as const)("“%s” emits a legal period", async (label, expected) => {
    const onChange = vi.fn();
    // Start somewhere else, so every choice is a change.
    render(<AmplifyPeriodPicker value={label === "All time" ? "2026-Q1" : "ALL"} onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: "Period" }));
    await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: label }));
    const sent = onChange.mock.calls.at(-1)?.[0] as string;
    if (typeof expected === "string") expect(sent).toBe(expected);
    else expect(sent).toMatch(expected);
    expect(AMPLIFY_PERIOD_PATTERN.test(sent)).toBe(true);
    expect(["MONTH", "QUARTER", "YEAR"]).not.toContain(sent);
  });

  it("emits YYYY-Qn when the quarter changes", async () => {
    const onChange = vi.fn();
    render(<AmplifyPeriodPicker value="2025-Q2" onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: "Quarter" }));
    await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Q4" }));
    expect(onChange).toHaveBeenLastCalledWith("2025-Q4");
  });
});

describe("My Campaign claim", () => {
  async function submit(user: ReturnType<typeof userEvent.setup>, url = "https://medium.com/@me/wso2") {
    const box = screen.getByRole("textbox", { name: "Post URL" });
    await user.clear(box);
    await user.type(box, url);
    const certify = screen.getByRole("checkbox", { name: "I certify this is related to WSO2." });
    if (!(certify as HTMLInputElement).checked) await user.click(certify);
    await user.click(screen.getByRole("button", { name: "Submit claim" }));
  }

  it("explains EVIDENCE_ALREADY_CLAIMED with the C5 copy", async () => {
    claimExternalShare.mockRejectedValueOnce(
      new HttpError("u", 409, JSON.stringify({ code: "EVIDENCE_ALREADY_CLAIMED" })),
    );
    renderAt(<AmplifyMyCampaignPage />);
    await submit(userEvent.setup());
    expect(await screen.findByText("Someone else already submitted this url, contact PO Team for review.")).toBeInTheDocument();
  });

  it("reuses the key on a retry after a timeout", async () => {
    claimExternalShare.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce({ status: "PENDING" });
    const user = userEvent.setup();
    renderAt(<AmplifyMyCampaignPage />);
    await submit(user);
    await screen.findByText("Failed to fetch");
    await user.click(screen.getByRole("button", { name: "Submit claim" }));
    await waitFor(() => expect(claimExternalShare).toHaveBeenCalledTimes(2));
    expect(claimExternalShare.mock.calls[1][2]).toBe(claimExternalShare.mock.calls[0][2]);
  });
});
