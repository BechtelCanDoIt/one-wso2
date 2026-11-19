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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import AskNoveraPalette from "@components/ask-novera/AskNoveraPalette";
import LegacyAskNoveraPalette from "@components/ask-novera/LegacyAskNoveraPalette";
import TopBar from "@components/top-bar/TopBar";
import { __resetForTests, togglePin } from "@features/pinned/pinnedStore";
import type { Capability } from "@constants/appMenu";

const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@config/authConfig", () => ({
  authConfig: { myAccountUrl: "https://myaccount.example.test" },
}));

vi.mock("@config/apiConfig", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@config/apiConfig")>();
  return {
    ...actual,
    csmUrl: "https://csm.example.test",
    isacUrl: "https://isac.example.test",
    isCsmConfigured: () => true,
    isIsacConfigured: () => true,
  };
});

vi.mock("@features/pinned/components/PinThisPageButton", () => ({
  default: () => null,
}));

vi.mock("@hooks/useAsgardeoSub", () => ({
  useAsgardeoSub: () => ({
    state: { status: "ready", sub: "user-under-test" },
    retry: () => {},
  }),
}));

const mockUserInfo = vi.fn();
vi.mock("@api/useUserInfo", () => ({
  useUserInfo: () => mockUserInfo(),
}));

vi.mock("@components/top-bar/ThemeSelect", () => ({
  default: () => <div data-testid="theme-select" />,
}));

vi.mock("@components/top-bar/UserProfileMenu", () => ({
  default: () => <div data-testid="user-profile-menu" />,
}));

const onClose = vi.fn();
const originalConfig = window.config;

beforeEach(() => {
  localStorage.clear();
  __resetForTests();
  onClose.mockClear();
  mockNavigate.mockClear();
  mockUserInfo.mockReturnValue({
    data: { privileges: [987] },
    isLoading: false,
  });
  window.config = {
    ...(originalConfig ?? {}),
    ONE_WSO2_PREVIEW_FEATURES: {
      novera: true,
      amplify: true,
      nda: true,
      swagStore: true,
      procurement: true,
      quickquote: true,
    },
  } as Window["config"];
});

afterEach(() => {
  window.config = originalConfig;
});

/** Renders the palette inside MemoryRouter. */
function renderPalette(initialQuery = "", userCaps?: Set<Capability>) {
  return render(
    <MemoryRouter>
      <AskNoveraPalette
        onClose={onClose}
        initialQuery={initialQuery}
        userCaps={userCaps}
      />
    </MemoryRouter>,
  );
}

/** Renders TopBar inside MemoryRouter. */
function renderTopBar() {
  return render(
    <MemoryRouter>
      <TopBar
        collapsed={false}
        onToggleSidebar={vi.fn()}
        onToggleWaffle={vi.fn()}
        waffleOpen={false}
      />
    </MemoryRouter>,
  );
}

describe("AskNoveraPalette", () => {
  it("presents as a modal dialog with search input", () => {
    renderPalette();
    const dialog = screen.getByRole("dialog", { name: "Ask Novera app search" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "ask-novera-palette-title");
    expect(screen.getByPlaceholderText("Search apps by name, description, or keyword...")).toBeInTheDocument();
  });

  it("prioritizes prefix matches over substring matches when searching settings", () => {
    renderPalette("settings");
    expect(screen.getByText("Settings & Preferences")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Settings" })).toBeInTheDocument();
  });

  it("lists pinned entries when query is empty", () => {
    togglePin({ kind: "page", id: "/me/my-team", label: "My Team", href: "/me/my-team" });
    renderPalette();
    expect(screen.getByRole("button", { name: "My Team" })).toBeInTheDocument();
  });

  it("closes on Escape key press", async () => {
    renderPalette();
    await userEvent.setup().keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when the back arrow button is clicked", async () => {
    renderPalette();
    const closeBtn = screen.getByRole("button", { name: "Close search" });
    await userEvent.setup().click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("finds Leave Management and displays navigation button and category tag", async () => {
    renderPalette("leave");
    expect(screen.getByText("Leave Management")).toBeInTheDocument();
    expect(screen.getByText("People Ops")).toBeInTheDocument();
    expect(screen.getByText("#Leave")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Leave App" })).toBeInTheDocument();
  });

  it("displays only the best match without related apps", () => {
    renderPalette("leave");
    expect(screen.getByText("Best Match")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Leave App" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Cafeteria App" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Subscriptions App" })).not.toBeInTheDocument();
  });

  it("navigates to the app route when the action button is clicked", async () => {
    renderPalette("leave");
    const openBtn = screen.getByRole("button", { name: "Open Leave App" });
    await userEvent.setup().click(openBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/me/leave");
    expect(onClose).toHaveBeenCalled();
  });

  it("finds best match finance app when searching finance", () => {
    renderPalette("finance");
    expect(screen.getByText("Best Match")).toBeInTheDocument();
    expect(screen.getByText("Finance Overview")).toBeInTheDocument();
  });

  it("finds Amplify best match when searching amplify", () => {
    renderPalette("amplify");
    expect(screen.getByText("Amplify Celebrate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Celebrate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create Amplify Post" })).not.toBeInTheDocument();
  });

  it("finds Amplify apps even with a typo like amplidy", () => {
    renderPalette("amplidy");
    expect(screen.getByText("Amplify Celebrate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Celebrate" })).toBeInTheDocument();
  });

  it("finds NDA generator under legal contracts", () => {
    renderPalette("nda");
    expect(screen.getByText("NDA Generator")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open NDA Generator" })).toBeInTheDocument();
  });

  it("finds Today I Learned under knowledge base", () => {
    renderPalette("til");
    expect(screen.getByText("Today I Learned (TIL)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open TIL Feed" })).toBeInTheDocument();
  });

  it("finds CSM and opens in an external tab when action button is clicked", async () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderPalette("csm");
    expect(screen.getByText("Customer Success Management (CSM)")).toBeInTheDocument();
    const csmBtn = screen.getByRole("button", { name: "Open CSM" });
    await userEvent.setup().click(csmBtn);
    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining("csm"),
      "_blank",
      "noopener,noreferrer",
    );
    windowOpenSpy.mockRestore();
  });

  it("finds Infrastructure tools via direct search for admins", () => {
    const adminCaps = new Set<Capability>(["employee", "admin"]);
    renderPalette("repository requests", adminCaps);
    expect(screen.getByRole("button", { name: "Open Repository Requests" })).toBeInTheDocument();
  });

  it("suppresses Infrastructure tools for standard users lacking admin capability", () => {
    renderPalette("repository requests");
    expect(screen.queryByRole("button", { name: "Open Repository Requests" })).not.toBeInTheDocument();
  });

  it("finds Corporate Cards via direct search", () => {
    renderPalette("corporate cards");
    expect(screen.getByRole("button", { name: "Open Corporate Cards" })).toBeInTheDocument();
  });

  it("prioritizes exact keyword partner finance for Partner Due Diligence over loose Finance tag", () => {
    const adminCaps = new Set<Capability>(["employee", "admin"]);
    renderPalette("partner finance", adminCaps);
    expect(screen.getByRole("button", { name: "Open Partner Due Diligence" })).toBeInTheDocument();
  });

  it("prioritizes Corporate Credit Cards over Credit Card Approvals when searching credit card", () => {
    const leadCaps = new Set<Capability>(["employee", "lead"]);
    renderPalette("credit card", leadCaps);
    expect(screen.getByRole("button", { name: "Open Corporate Cards" })).toBeInTheDocument();
  });

  it("finds Cafeteria menu via direct search under Me", () => {
    renderPalette("cafeteria");
    expect(screen.getByRole("button", { name: "Open Cafeteria App" })).toBeInTheDocument();
  });

  it("suppresses preview-gated apps when their preview flag is disabled", () => {
    window.config = {
      ...(originalConfig ?? {}),
      ONE_WSO2_PREVIEW_FEATURES: {
        novera: true,
        amplify: false,
        swagStore: false,
        nda: false,
      },
    } as Window["config"];
    renderPalette("amplify");
    expect(screen.queryByText("Amplify Celebrate")).not.toBeInTheDocument();
    expect(screen.getByText(/No apps found matching/)).toBeInTheDocument();
  });

  it("navigates to the correct destination route for selected apps", async () => {
    renderPalette("promotions");
    const promoBtn = screen.getByRole("button", { name: "Open Promotions" });
    await userEvent.setup().click(promoBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/me/promotion");

    mockNavigate.mockClear();
    renderPalette("claims");
    const claimsBtn = screen.getByRole("button", { name: "Open Expenses App" });
    await userEvent.setup().click(claimsBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/me/claims");
  });

  it("suppresses admin-only apps for standard users lacking admin capability", () => {
    const standardCaps = new Set<Capability>(["employee"]);
    renderPalette("active employees", standardCaps);
    expect(screen.queryByText("Active Employees")).not.toBeInTheDocument();
  });

  it("displays admin-only apps for users with admin capability", () => {
    const adminCaps = new Set<Capability>(["employee", "admin"]);
    renderPalette("active employees", adminCaps);
    expect(screen.getByText("Active Employees")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Employee Directory" })).toBeInTheDocument();
  });

  it("shows clean empty state when query matches no apps", () => {
    renderPalette("nonexistentxyzquery");
    expect(screen.getByText(/No apps found matching/)).toBeInTheDocument();
  });

  it("navigates to banking administration for admins", async () => {
    const adminCaps = new Set<Capability>(["employee", "admin"]);
    renderPalette("banking admin", adminCaps);
    expect(screen.getByText("Banking Administration")).toBeInTheDocument();
    const adminBtn = screen.getByRole("button", { name: "Open Banking Admin" });
    await userEvent.setup().click(adminBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/banking/admin");
  });

  it("navigates to personal banking details under Me", async () => {
    renderPalette("banking");
    expect(screen.getByText("Personal Banking Details")).toBeInTheDocument();
    const personalBtn = screen.getByRole("button", { name: "Open Banking Details" });
    await userEvent.setup().click(personalBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/me/banking");
  });

  it("displays the best match for Swag Store without related apps", () => {
    renderPalette("swag");
    expect(screen.getAllByText("Swag Store").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Open Swag Store" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Shopping Cart" })).not.toBeInTheDocument();
  });
});

describe("LegacyAskNoveraPalette", () => {
  it("renders coming soon modal and lists pinned items", () => {
    togglePin({ kind: "page", id: "/me/profile", label: "My Profile", href: "/me/profile" });
    render(
      <MemoryRouter>
        <LegacyAskNoveraPalette onClose={onClose} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My Profile" })).toBeInTheDocument();
  });
});

describe("TopBar Search Integration & Gating", () => {
  it("renders centered search bar when novera preview is enabled", () => {
    renderTopBar();
    expect(screen.getByPlaceholderText("Ask Novera")).toBeInTheDocument();
  });

  it("opens the overlay canvas when Enter is pressed in TopBar search bar", async () => {
    renderTopBar();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText("Ask Novera");
    await user.type(input, "leave{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Leave Management")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Leave App" })).toBeInTheDocument();
  });

  it("clears search input when clear button is clicked", async () => {
    renderTopBar();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText("Ask Novera");
    await user.type(input, "expenses");
    expect(input).toHaveValue("expenses");
    const clearBtn = screen.getByRole("button", { name: "Clear search" });
    await user.click(clearBtn);
    expect(input).toHaveValue("");
  });

  it("renders legacy coming soon button when novera preview is disabled (production default)", async () => {
    window.config = {
      ...(originalConfig ?? {}),
      ONE_WSO2_PREVIEW_FEATURES: { novera: false },
    } as Window["config"];

    renderTopBar();
    const button = screen.getByRole("button", { name: "Ask Novera" });
    expect(button).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ask Novera")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(button);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("focuses search input when Cmd+K or Ctrl+K is pressed with novera preview enabled", async () => {
    renderTopBar();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText("Ask Novera");
    expect(input).not.toHaveFocus();

    // Verify Cmd+K modifier (macOS)
    await user.keyboard("{Meta>}k{/Meta}");
    expect(input).toHaveFocus();

    input.blur();
    expect(input).not.toHaveFocus();

    // Verify Ctrl+K modifier (Windows/Linux)
    await user.keyboard("{Control>}k{/Control}");
    expect(input).toHaveFocus();
  });

  it("opens legacy palette when Cmd+K or Ctrl+K is pressed with novera preview disabled", async () => {
    window.config = {
      ...(originalConfig ?? {}),
      ONE_WSO2_PREVIEW_FEATURES: { novera: false },
    } as Window["config"];
    renderTopBar();
    const user = userEvent.setup();

    // Verify Ctrl+K modifier opens the legacy modal
    await user.keyboard("{Control>}k{/Control}");
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });
});
