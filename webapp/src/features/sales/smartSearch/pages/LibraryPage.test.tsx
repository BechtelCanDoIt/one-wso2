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
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { HttpError } from "@api/http";
import type { SmartSearchResponse } from "../api/smartSearchTypes";
import {
  ANSWER_RESPONSE,
  ANSWER_TEXT,
  DECK_SOURCE,
  PROSPECTUS_SOURCE,
  SOURCES_RESPONSE,
  TEST_NOW,
  TEST_PDF_SOURCE,
} from "../testing/fixtures";

// The data hooks, storage and the shell's pin and notification hooks are replaced with stand-ins the
// tests control. They pull Asgardeo into the module graph, and that package does not resolve under
// vitest's ESM loader.
const mocks = vi.hoisted(() => {
  const refetch = vi.fn();
  return {
    refetch,
    togglePin: vi.fn(),
    showWarning: vi.fn(),
    recentAdd: vi.fn(),
    recentClear: vi.fn(),
    introDismiss: vi.fn(),
    state: {
      configured: true,
      sources: {} as Record<string, unknown>,
      answer: {} as Record<string, unknown>,
      pinned: [] as { kind: string; id: string; label: string; href: string }[],
      recent: [] as string[],
      showIntro: false,
    },
  };
});

vi.mock("@config/apiConfig", () => ({ isSmartSearchBackendConfigured: () => mocks.state.configured }));
vi.mock("../api/useSmartSearch", () => ({
  useSmartSearchSources: () => mocks.state.sources,
  useSmartSearchAnswer: () => mocks.state.answer,
}));
vi.mock("@features/pinned/usePinned", () => ({
  usePinnedEntries: () => mocks.state.pinned,
  useTogglePin: () => mocks.togglePin,
}));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showWarning: mocks.showWarning, showError: vi.fn(), showSuccess: vi.fn() }),
}));
vi.mock("../util/useLibraryStorage", () => ({
  useRecentSearches: () => ({ items: mocks.state.recent, add: mocks.recentAdd, clear: mocks.recentClear }),
  useIntroCard: () => ({ show: mocks.state.showIntro, dismiss: mocks.introDismiss }),
}));

import LibraryPage from "./LibraryPage";

const query = (overrides: Record<string, unknown>) => ({
  data: undefined,
  isPending: false,
  isLoading: false,
  isError: false,
  isSuccess: false,
  isFetching: false,
  error: null,
  refetch: mocks.refetch,
  ...overrides,
});
const loading = () => query({ isPending: true, isLoading: true, isFetching: true });
const success = (data: SmartSearchResponse) => query({ data, isSuccess: true });
const failure = (error: unknown) => query({ isError: true, error });

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LibraryPage />
      <Where />
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId("where").textContent;
const RESULTS_PATH = "/sales/library?q=wso2con";

function setupClipboard() {
  const user = userEvent.setup();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  return { user, writeText };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
  mocks.refetch.mockReset();
  mocks.togglePin.mockReset().mockReturnValue("pinned");
  mocks.showWarning.mockReset();
  mocks.recentAdd.mockReset();
  mocks.recentClear.mockReset();
  mocks.introDismiss.mockReset();
  mocks.state.configured = true;
  mocks.state.sources = success(SOURCES_RESPONSE);
  mocks.state.answer = success(ANSWER_RESPONSE);
  mocks.state.pinned = [];
  mocks.state.recent = [];
  mocks.state.showIntro = false;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("when the backend is not set", () => {
  it("names the config key and shows no search box", () => {
    mocks.state.configured = false;
    renderAt("/sales/library");
    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument();
    expect(screen.getByText("ONE_WSO2_SMART_SEARCH_BACKEND_URL")).toBeInTheDocument();
    expect(screen.getByText(/isn.t connected yet/)).toBeInTheDocument();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
  });

  it("shows the notice even when the address carries a question", () => {
    mocks.state.configured = false;
    renderAt(RESULTS_PATH);
    expect(screen.getByText("ONE_WSO2_SMART_SEARCH_BACKEND_URL")).toBeInTheDocument();
  });
});

describe("the start screen", () => {
  it("offers the search box, the privacy line and five topics", () => {
    renderAt("/sales/library");
    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByText(/Searches Pitstop content only/)).toBeInTheDocument();
    for (const topic of ["Security", "Pricing", "Competitors", "Demos", "Onboarding"]) {
      expect(screen.getByText(topic)).toBeInTheDocument();
    }
  });

  it("searches only once there is something to search for", async () => {
    const user = userEvent.setup();
    renderAt("/sales/library");
    const button = screen.getByRole("button", { name: "Search" });
    expect(button).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Ask a question" }), "   ");
    expect(button).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Ask a question" }), "pricing, discounts");
    expect(button).toBeEnabled();
  });

  it("offers a clear button only while there is something typed, and empties the box on the start screen", async () => {
    const user = userEvent.setup();
    renderAt("/sales/library");
    const box = screen.getByRole("textbox", { name: "Ask a question" });
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
    await user.type(box, "pricing");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(box).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
    expect(where()).toBe("/sales/library");
    expect(mocks.recentAdd).not.toHaveBeenCalled();
  });

  it("puts the question in the address and remembers it", async () => {
    const user = userEvent.setup();
    renderAt("/sales/library");
    await user.type(screen.getByRole("textbox", { name: "Ask a question" }), "  pricing, discounts & terms?{Enter}");
    expect(where()).toBe("/sales/library?q=pricing%2C%20discounts%20%26%20terms%3F");
    expect(mocks.recentAdd).toHaveBeenCalledWith("pricing, discounts & terms?");
  });

  it("starts a search from a topic", async () => {
    const user = userEvent.setup();
    renderAt("/sales/library");
    await user.click(screen.getByText("Security"));
    expect(where()).toBe("/sales/library?q=How%20do%20we%20answer%20a%20security%20questionnaire%3F");
    expect(mocks.recentAdd).toHaveBeenCalledWith("How do we answer a security questionnaire?");
  });

  it("treats a blank question in the address as no question", () => {
    renderAt("/sales/library?q=%20%20");
    expect(screen.getByText("Start with a topic")).toBeInTheDocument();
  });

  it("lists recent searches and runs one on a click", async () => {
    const user = userEvent.setup();
    mocks.state.recent = ["pricing one-pager", "battlecards"];
    renderAt("/sales/library");
    expect(screen.getByText("pricing one-pager")).toBeInTheDocument();
    await user.click(screen.getByText("battlecards"));
    expect(where()).toBe("/sales/library?q=battlecards");
    expect(mocks.recentAdd).toHaveBeenCalledWith("battlecards");
  });

  it("clears the recent searches", async () => {
    const user = userEvent.setup();
    mocks.state.recent = ["pricing one-pager"];
    renderAt("/sales/library");
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(mocks.recentClear).toHaveBeenCalled();
  });

  it("says so when there are no recent searches, and offers no Clear", () => {
    renderAt("/sales/library");
    expect(screen.getByText("Your recent searches show up here.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    expect(screen.getByText(/Recent searches are kept in this browser only/)).toBeInTheDocument();
  });

  it("lists pinned Library searches only, and opens one", async () => {
    const user = userEvent.setup();
    mocks.state.pinned = [
      { kind: "search", id: "/sales/library?q=pricing", label: "Library: pricing", href: "/sales/library?q=pricing" },
      { kind: "search", id: "/sales?x=1", label: "Meetings filter", href: "/sales?x=1" },
      { kind: "page", id: "/sales/library", label: "Library", href: "/sales/library" },
    ];
    renderAt("/sales/library");
    expect(screen.queryByText("Meetings filter")).not.toBeInTheDocument();
    await user.click(screen.getByText("Library: pricing"));
    expect(where()).toBe("/sales/library?q=pricing");
  });

  it("explains pinning when nothing is pinned", () => {
    renderAt("/sales/library");
    expect(screen.getByText(/Pin a search from its results/)).toBeInTheDocument();
  });

  it("shows the welcome card once, and dismisses it", async () => {
    const user = userEvent.setup();
    mocks.state.showIntro = true;
    renderAt("/sales/library");
    expect(screen.getByText("New in Sales: Library")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(mocks.introDismiss).toHaveBeenCalled();
  });

  it("shows no welcome card once it has been seen", () => {
    renderAt("/sales/library");
    expect(screen.queryByText("New in Sales: Library")).not.toBeInTheDocument();
  });
});

describe("the results", () => {
  it("shows the matching documents, the answer and its sources", () => {
    renderAt(RESULTS_PATH);
    expect(screen.getAllByTestId("library-result")).toHaveLength(5);
    const answer = screen.getByRole("region", { name: "AI-generated answer" });
    expect(within(answer).getByText(ANSWER_TEXT)).toBeInTheDocument();
    expect(within(answer).getByRole("button", { name: /^1 · TEST/ })).toBeInTheDocument();
    expect(within(answer).getByRole("button", { name: /^5 · WSO2Con NA 2026/ })).toBeInTheDocument();
  });

  it("marks the words of the question in each passage", () => {
    const { container } = renderAt(RESULTS_PATH);
    const marked = [...container.querySelectorAll("mark")].map((mark) => mark.textContent?.toLowerCase());
    expect(marked.length).toBeGreaterThan(0);
    expect(new Set(marked)).toEqual(new Set(["wso2con"]));
  });

  it("says how well each matches, and flags an old item", () => {
    renderAt(RESULTS_PATH);
    const cards = screen.getAllByTestId("library-result");
    expect(within(cards[0]!).getByText("Good match")).toBeInTheDocument();
    expect(within(cards[0]!).getByText("Added Oct 2026")).toBeInTheDocument();
    expect(within(cards[1]!).getByText("Added Oct 2024 - check it is still current")).toBeInTheDocument();
  });

  it("calls a close match a strong one", () => {
    const [first, ...rest] = SOURCES_RESPONSE.sources;
    mocks.state.sources = success({ ...SOURCES_RESPONSE, sources: [{ ...first!, similarityScore: 0.82 }, ...rest] });
    renderAt(RESULTS_PATH);
    expect(within(screen.getAllByTestId("library-result")[0]!).getByText("Strong match")).toBeInTheDocument();
  });

  it("shows each document's tags, and skips the empty ones", () => {
    renderAt(RESULTS_PATH);
    const cards = screen.getAllByTestId("library-result");
    expect(within(cards[1]!).getByText("wso2con2025")).toBeInTheDocument();
    expect(within(cards[0]!).getAllByText(/.+/).some((node) => node.textContent === "")).toBe(false);
  });

  it("shows the documents while the answer is still being written", () => {
    mocks.state.answer = query({ isPending: true, isLoading: true });
    renderAt(RESULTS_PATH);
    expect(screen.getByRole("status", { name: "Writing an answer" })).toBeInTheDocument();
    expect(screen.getAllByTestId("library-result")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
  });

  it("says so when no answer could be written, and still lets the sources be copied", () => {
    mocks.state.answer = success({ ...SOURCES_RESPONSE, answer: null });
    renderAt(RESULTS_PATH);
    expect(screen.getByText(/No written answer for this search/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("does not show an answer that was written from different documents", () => {
    mocks.state.answer = success({ ...ANSWER_RESPONSE, sources: [DECK_SOURCE, PROSPECTUS_SOURCE] });
    renderAt(RESULTS_PATH);
    expect(screen.queryByText(ANSWER_TEXT)).not.toBeInTheDocument();
    expect(screen.getByText(/No written answer for this search/)).toBeInTheDocument();
  });

  it("explains a rate-limited answer", () => {
    mocks.state.answer = failure(new HttpError("https://x/smart-search", 429, ""));
    renderAt(RESULTS_PATH);
    expect(screen.getByText(/written answer is paused/)).toBeInTheDocument();
    expect(screen.getAllByTestId("library-result")).toHaveLength(5);
  });

  it("falls back quietly when the answer fails for another reason", () => {
    mocks.state.answer = failure(new HttpError("https://x/smart-search", 500, ""));
    renderAt(RESULTS_PATH);
    expect(screen.getByText(/No written answer for this search/)).toBeInTheDocument();
  });

  it("shows the answer as plain text, never as markup", () => {
    mocks.state.answer = success({ ...ANSWER_RESPONSE, answer: "Use <b>bold</b> and <img src=x onerror=alert(1)>" });
    const { container } = renderAt(RESULTS_PATH);
    expect(screen.getByText("Use <b>bold</b> and <img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
  });
});

describe("filtering by type", () => {
  it("lists the types that are there, and narrows to one", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    for (const label of [/^All$/, /^Documents · \d+$/, /^Decks · \d+$/, /^PDFs · 2$/, /^Web pages · \d+$/]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /^Videos/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^PDFs/ }));
    expect(screen.getAllByTestId("library-result")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /^PDFs/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getAllByTestId("library-result")).toHaveLength(5);
  });

  it("numbers the sources again after filtering", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: /^Decks/ }));
    const answer = screen.getByRole("region", { name: "AI-generated answer" });
    expect(within(answer).getByRole("button", { name: /^1 · WSO2Con 2025 - Regional Presentation/ })).toBeInTheDocument();
    expect(within(answer).queryByRole("button", { name: /^2 ·/ })).not.toBeInTheDocument();
  });

  it("offers no filter when every result is the same type", () => {
    mocks.state.sources = success({
      ...SOURCES_RESPONSE,
      sources: [TEST_PDF_SOURCE, PROSPECTUS_SOURCE],
    });
    mocks.state.answer = success({ ...SOURCES_RESPONSE, sources: [TEST_PDF_SOURCE, PROSPECTUS_SOURCE], answer: "A." });
    renderAt(RESULTS_PATH);
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
  });
});

describe("the preview", () => {
  it("starts with the first result, and says a PDF opens whole in a new tab", () => {
    renderAt(RESULTS_PATH);
    const preview = screen.getByRole("complementary", { name: "Preview" });
    expect(within(preview).getByText("TEST")).toBeInTheDocument();
    expect(within(preview).getByText(/The match is on Page 9\. Google Drive opens the whole PDF in a new tab\./)).toBeInTheDocument();
    expect(within(preview).getByRole("link", { name: "Open" })).toHaveAttribute("href", TEST_PDF_SOURCE.driveLink);
  });

  it("frames a Google deck at its slide when it is picked, and opens it at that slide", async () => {
    const user = userEvent.setup();
    const { container } = renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: "Preview WSO2Con 2025 - Regional Presentation" }));
    const frame = container.querySelector("iframe");
    expect(frame).not.toBeNull();
    expect(frame?.getAttribute("src")).toBe(
      "https://docs.google.com/presentation/d/1jnIhpsBA00e4EJ8BIvaIkD1MwvDHOx-XPommKUo9Fe4/embed?slide=id.g2f820b48fab_0_28",
    );
    expect(frame?.getAttribute("title")).toBe("Preview of WSO2Con 2025 - Regional Presentation");
    expect(frame?.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(frame?.getAttribute("sandbox")).not.toContain("allow-top-navigation");
    const open = screen.getByRole("link", { name: "Open at Slide 5" });
    expect(open).toHaveAttribute("href", DECK_SOURCE.nativeLink);
    expect(open).toHaveAttribute("target", "_blank");
    expect(open).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("frames nothing for a Drive PDF", () => {
    const { container } = renderAt(RESULTS_PATH);
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("previews the passage that is picked, and the answer's chips pick a result", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    const answer = screen.getByRole("region", { name: "AI-generated answer" });
    await user.click(within(answer).getByRole("button", { name: /^4 · Convince Your Boss/ }));
    const preview = screen.getByRole("complementary", { name: "Preview" });
    expect(within(preview).getByText("Convince Your Boss - Landing Page")).toBeInTheDocument();
    expect(within(preview).getByText(/scrolls to the matching text/)).toBeInTheDocument();
  });

  it("opens a passage from its own link, in a new tab", () => {
    renderAt(RESULTS_PATH);
    const link = screen.getByRole("link", { name: "Open WSO2Con 2025 - Regional Presentation at Slide 5 in a new tab" });
    expect(link).toHaveAttribute("href", DECK_SOURCE.nativeLink);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("copying the answer", () => {
  it("shows exactly what will be copied, as an email to begin with", () => {
    renderAt(RESULTS_PATH);
    const text = screen.getByLabelText("What will be copied").textContent ?? "";
    expect(text.startsWith("Subject: wso2con\n\nHi [Name],\n\n")).toBe(true);
    expect(text).toContain(ANSWER_TEXT);
    expect(screen.getByRole("button", { name: "Email" })).toHaveAttribute("aria-pressed", "true");
  });

  it("changes the text with the format", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: "Chat" }));
    expect(screen.getByLabelText("What will be copied").textContent).toContain("•");
    await user.click(screen.getByRole("button", { name: "Plain" }));
    expect(screen.getByLabelText("What will be copied").textContent).toContain("Sources:\n1. ");
  });

  it("copies the text, says so, and goes back to Copy once the text changes", async () => {
    const { user, writeText } = setupClipboard();
    renderAt(RESULTS_PATH);
    const shown = screen.getByLabelText("What will be copied").textContent;
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(shown);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Chat" }));
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("says so when the browser refuses to copy", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(mocks.showWarning).toHaveBeenCalledWith(expect.stringMatching(/Couldn.t copy/));
    expect(screen.queryByRole("button", { name: "Copied" })).not.toBeInTheDocument();
  });
});

describe("pinning and sharing a search", () => {
  it("unpins a pinned search from the start screen", async () => {
    const user = userEvent.setup();
    const entry = { kind: "search", id: "/sales/library?q=wso2con", label: "Library: wso2con", href: "/sales/library?q=wso2con" };
    mocks.state.pinned = [entry];
    renderAt("/sales/library");
    await user.click(screen.getByRole("button", { name: "Unpin Library: wso2con" }));
    expect(mocks.togglePin).toHaveBeenCalledWith(entry);
  });

  it("pins the search with the question in the label and the address", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: "Pin search" }));
    expect(mocks.togglePin).toHaveBeenCalledWith({
      kind: "search",
      id: "/sales/library?q=wso2con",
      label: "Library: wso2con",
      href: "/sales/library?q=wso2con",
    });
  });

  it("shortens a long question in the label", async () => {
    const user = userEvent.setup();
    const long = "a".repeat(80);
    renderAt(`/sales/library?q=${long}`);
    await user.click(screen.getByRole("button", { name: "Pin search" }));
    const entry = mocks.togglePin.mock.calls[0]?.[0] as { label: string };
    expect(entry.label.length).toBeLessThanOrEqual("Library: ".length + 36);
    expect(entry.label.endsWith("…")).toBe(true);
  });

  it("shows the search as pinned once it is, and says when the pins are full", async () => {
    const user = userEvent.setup();
    mocks.state.pinned = [
      { kind: "search", id: "/sales/library?q=wso2con", label: "Library: wso2con", href: "/sales/library?q=wso2con" },
    ];
    renderAt(RESULTS_PATH);
    expect(screen.getByRole("button", { name: "Pinned" })).toHaveAttribute("aria-pressed", "true");

    mocks.togglePin.mockReturnValue("at-capacity");
    await user.click(screen.getByRole("button", { name: "Pinned" }));
    expect(mocks.showWarning).toHaveBeenCalledWith(expect.stringMatching(/up to 8 pages/));
  });

  it("copies a link that rebuilds the same search", async () => {
    const { user, writeText } = setupClipboard();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/sales/library?q=wso2con`);
  });
});

describe("moving around", () => {
  it("goes back to the start screen", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: "Back to the Library" }));
    expect(where()).toBe("/sales/library");
  });

  it("runs a new question from the box on the results screen", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    const box = screen.getByRole("textbox", { name: "Ask a question" });
    expect(box).toHaveValue("wso2con");
    await user.clear(box);
    await user.type(box, "pricing{Enter}");
    expect(where()).toBe("/sales/library?q=pricing");
    expect(mocks.recentAdd).toHaveBeenCalledWith("pricing");
  });

  it("clears the box and goes back to the plain Library address", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    expect(screen.getByRole("textbox", { name: "Ask a question" })).toHaveValue("wso2con");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(where()).toBe("/sales/library");
    expect(screen.getByText("Start with a topic")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Ask a question" })).toHaveValue("");
  });

  it("cuts an over-long question in the address to the longest the box accepts", () => {
    renderAt(`/sales/library?q=${"b".repeat(400)}`);
    expect(screen.getByRole("textbox", { name: "Ask a question" })).toHaveValue("b".repeat(300));
  });
});

describe("when the search does not give results", () => {
  it("shows the search as running while the documents load", () => {
    mocks.state.sources = loading();
    renderAt(RESULTS_PATH);
    expect(screen.getByRole("status", { name: "Searching" })).toBeInTheDocument();
    expect(screen.queryAllByTestId("library-result")).toHaveLength(0);
  });

  it("says plainly when the caller isn't admitted to Pitstop", () => {
    mocks.state.sources = failure(new HttpError("https://x/smart-search", 403, ""));
    renderAt(RESULTS_PATH);
    expect(screen.getByText(/You don.t have access to Pitstop content/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("says to wait when the caller has searched too much", () => {
    mocks.state.sources = failure(new HttpError("https://x/smart-search", 429, ""));
    renderAt(RESULTS_PATH);
    expect(screen.getByText(/searched a lot in a short time/)).toBeInTheDocument();
  });

  it("offers a retry when the search itself failed", async () => {
    const user = userEvent.setup();
    mocks.state.sources = failure(new HttpError("https://x/smart-search", 500, '{"message":"Error while searching."}'));
    renderAt(RESULTS_PATH);
    expect(screen.getByText(/Couldn.t run that search\. Error while searching\./)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("says when nothing matched", () => {
    mocks.state.sources = success({ answer: null, sources: [], contents: [] });
    renderAt(RESULTS_PATH);
    expect(screen.getByText("No results found")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "AI-generated answer" })).not.toBeInTheDocument();
  });
});
