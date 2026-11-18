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

import { useEffect, useImperativeHandle, type ReactNode, type Ref } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ParCycle, ParRating } from "../api/types";
import { encodeParComment } from "../util/parComment";
import type { ParRichTextFieldHandle } from "./ParRichTextField";

let rating: ParRating;
let responseCount = 3;
// What the suggestion query holds once it's asked for, and whether the last
// render asked for it. (The render that seeds the saved summary starts with an
// empty one, but React discards it before any query could fetch.)
let suggestion: { data?: unknown; isLoading?: boolean; isError?: boolean; error?: Error } = {};
let suggestionAskedFor = false;
const save = vi.fn();
let summarySavePending = false;

vi.mock("../api/useParData", () => ({ useParRating: () => ({ data: rating, isLoading: false, isError: false }) }));
let ratingUpdatePending = false;
const ratingMutate = vi.fn();
vi.mock("../api/useLeadRatingUpdate", () => ({
  useLeadRatingUpdate: () => ({ mutate: ratingMutate, isPending: ratingUpdatePending }),
}));
vi.mock("../api/useLeadHistory", () => ({ useParEmployeeReviews: () => ({ isSuccess: true, data: [] }) }));
let selfReviewLookup: { data?: null; isError?: boolean; error?: Error; refetch?: () => void } = { data: null };
vi.mock("../api/useSelfReview", () => ({ useSelfReview: () => selfReviewLookup }));
vi.mock("../api/useReview360", () => ({
  useParShowsPar2: () => ({ showsPar2: true }),
  useReviewResponses: () => ({ data: { responseCount } }),
}));
vi.mock("../api/useLead360Summary", () => ({
  useLead360SummarySuggestion: (_cycle: number, _email: string, _count: number, enabled: boolean) => {
    suggestionAskedFor = enabled;
    // As the hook does once it has read one, the rating then says what the
    // suggestion was written from (seen on the next render).
    const written = (suggestion.data as { responseCount?: number } | undefined)?.responseCount;
    useEffect(() => {
      if (enabled && written !== undefined) rating = { ...rating, parLead360SuggestionResponses: written };
    }, [enabled, written]);
    return enabled ? suggestion : {};
  },
  useSaveLead360Summary: () => ({ mutate: save, mutateAsync: save, isPending: summarySavePending }),
}));
vi.mock("../hooks/useGoogleDrivePicker", () => ({
  useGoogleDrivePicker: () => ({ openPicker: vi.fn(), isLoading: false, error: null }),
}));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));
// A textarea for the editor, where Tab takes the suggestion, as in the real
// one (ParRichTextField.test.tsx).
vi.mock("./ParRichTextField", () => ({
  default: function Field({
    value,
    onChange,
    placeholder,
    suggestion,
    onAcceptSuggestion,
    ref,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    suggestion?: ReactNode;
    onAcceptSuggestion?: () => void;
    ref?: Ref<ParRichTextFieldHandle>;
  }) {
    useImperativeHandle(ref, () => ({ replaceContents: (html: string) => onChange(html) }));
    return (
      <div>
        <textarea
          aria-label={placeholder || EMPTY_FIELD}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Tab" && onAcceptSuggestion) onAcceptSuggestion();
          }}
        />
        {suggestion}
      </div>
    );
  },
}));
vi.mock("./ParLead360Evidence", () => ({ default: () => null, ParLead360Guidance: () => null }));
vi.mock("./Leadership360ResultsCard", () => ({ default: () => null }));

const { default: ParLeadReviewPanel } = await import("./ParLeadReviewPanel");

const cycle = {
  parCycleId: 2,
  parCycleEndDate: "2999-12-31",
  parLeadDeadline: "2999-12-31",
  parEmployeeDeadline: "2999-12-01",
  parCycleConfigurations: { parRatings: ["Successful"] },
} as unknown as ParCycle;
const FIELD = "Summarise the 360° feedback";
// The summary field while a suggestion shows in it, with no placeholder.
const EMPTY_FIELD = "summary field with a suggestion";
const SUGGESTED = { summary: "Colleagues see real ownership.\nThey'd like earlier updates.", responseCount: 3 };

function show(overrides: Partial<ParRating> = {}) {
  rating = {
    parRatingId: 7,
    parCycleId: 2,
    parEmployeeEmail: "alex@example.com",
    parEmployeeStatus: "SHARED",
    parLeadStatus: "DRAFT",
    parIsLeadershipEmployee: false,
    ...overrides,
  } as ParRating;
  return render(<ParLeadReviewPanel cycle={cycle} employeeEmail="alex@example.com" />);
}

beforeEach(() => {
  ratingUpdatePending = false;
  summarySavePending = false;
  ratingMutate.mockReset();
  selfReviewLookup = { data: null };
  responseCount = 3;
  suggestion = { data: SUGGESTED };
  suggestionAskedFor = false;
  save.mockReset();
});

describe("ParLeadReviewPanel: the employee's self-review", () => {
  it("says when it couldn't be loaded, with Retry, rather than that it wasn't shared", () => {
    selfReviewLookup = { isError: true, error: new Error("HTTP 500"), refetch: vi.fn() };
    show();
    expect(screen.getByText(/Couldn't load the employee's self-review/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
    expect(screen.queryByText("The employee hasn't shared their self-review yet")).not.toBeInTheDocument();
  });
});

describe("ParLeadReviewPanel: 360° summary", () => {
  const INSERTED = "<p>Colleagues see real ownership.</p><p>They'd like earlier updates.</p>";

  it("shows the suggestion in grey while the summary is empty, and a click on it inserts it as paragraphs", () => {
    show();
    expect(screen.getByText("Suggested from 3 360° responses")).toBeInTheDocument();
    // It isn't in the summary until it's inserted, and there's no asking for another.
    expect(screen.getByLabelText(EMPTY_FIELD)).toHaveValue("");
    expect(screen.queryByRole("button", { name: /Suggest|Insert/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Colleagues see real ownership."));
    expect(screen.getByLabelText(FIELD)).toHaveValue(INSERTED);
    expect(screen.queryByText("Suggested from 3 360° responses")).not.toBeInTheDocument();
  });

  it("inserts it on Tab in the empty field", () => {
    show();
    fireEvent.keyDown(screen.getByLabelText(EMPTY_FIELD), { key: "Tab" });
    expect(screen.getByLabelText(FIELD)).toHaveValue(INSERTED);
  });

  it("shows placeholder lines while the suggestion is written", () => {
    suggestion = { isLoading: true };
    show();
    expect(screen.getByText("Writing a suggestion from the 360° feedback…")).toBeInTheDocument();
    expect(screen.queryByText("Colleagues see real ownership.")).not.toBeInTheDocument();
  });

  it("needs 3 submitted responses before there's a suggestion", () => {
    responseCount = 2;
    show();
    expect(suggestionAskedFor).toBe(false);
    expect(screen.getByLabelText(FIELD)).toBeInTheDocument();
  });

  it("leaves the lead's own words alone when no responses came in since the last suggestion", () => {
    show({ parLead360Summary: encodeParComment("<p>My own words.</p>"), parLead360SuggestionResponses: 3 });
    expect(screen.getByLabelText(FIELD)).toHaveValue("<p>My own words.</p>");
    expect(suggestionAskedFor).toBe(false);
    expect(screen.queryByRole("button", { name: /suggestion/ })).not.toBeInTheDocument();
  });

  it("offers the updated suggestion again only when more responses come in, once it's dismissed", () => {
    responseCount = 5;
    suggestion = { data: { ...SUGGESTED, responseCount: 5 } };
    show({ parLead360Summary: encodeParComment("<p>My own words.</p>"), parLead360SuggestionResponses: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Show updated suggestion" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Suggested from 5 360° responses")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /suggestion/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText(FIELD)).toHaveValue("<p>My own words.</p>");
  });

  it("offers the suggestion from newer responses, and replaces the lead's words only on Replace", () => {
    responseCount = 5;
    suggestion = { data: { ...SUGGESTED, responseCount: 5 } };
    show({ parLead360Summary: encodeParComment("<p>My own words.</p>"), parLead360SuggestionResponses: 3 });
    expect(screen.getByText("2 new 360° responses since the last suggestion.")).toBeInTheDocument();
    expect(suggestionAskedFor).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Show updated suggestion" }));
    expect(screen.getByText("Suggested from 5 360° responses")).toBeInTheDocument();
    // Its text doesn't replace them on a click.
    fireEvent.click(screen.getByText("Colleagues see real ownership."));
    expect(screen.getByLabelText(FIELD)).toHaveValue("<p>My own words.</p>");
    fireEvent.click(screen.getByRole("button", { name: "Replace" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText(FIELD)).toHaveValue(INSERTED);
  });

  it("offers one when the lead wrote their own before any suggestion", () => {
    show({ parLead360Summary: encodeParComment("<p>My own words.</p>") });
    fireEvent.click(screen.getByRole("button", { name: "Show suggestion" }));
    expect(screen.getByText("Suggested from 3 360° responses")).toBeInTheDocument();
  });

  it("says so quietly when a suggestion can't be written", () => {
    suggestion = { isError: true, error: new Error("HTTP 503") };
    show();
    expect(screen.getByText(/Couldn't write a suggestion just now/)).toBeInTheDocument();
    expect(screen.getByLabelText(FIELD)).toBeInTheDocument();
  });

  it("says on sharing that a suggestion not inserted isn't shared", () => {
    show({ parRating: "Successful", parLeadComment: encodeParComment("<p>Great cycle.</p>") });
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(screen.getByText(/The suggestion in grey is only included if you insert it/)).toBeInTheDocument();
  });

  it("keeps the share confirmation open while sharing, so nothing can be edited behind it", () => {
    const view = show({ parRating: "Successful", parLeadComment: encodeParComment("<p>Great cycle.</p>") });
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    ratingUpdatePending = true;
    view.rerender(<ParLeadReviewPanel cycle={cycle} employeeEmail="alex@example.com" />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sharing…" })).toBeDisabled();
  });

  it("saves the latest summary before sharing, and the confirmation can't be dismissed meanwhile", async () => {
    suggestion = {};
    let finishSave = () => {};
    save.mockImplementation(() => new Promise<void>((resolve) => (finishSave = resolve)));
    const view = show({ parRating: "Successful", parLeadComment: encodeParComment("<p>Great cycle.</p>") });
    fireEvent.change(screen.getByLabelText(FIELD), { target: { value: "<p>Clear ownership.</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Share" }));
    expect(save).toHaveBeenCalledWith(encodeParComment("<p>Clear ownership.</p>"));

    summarySavePending = true;
    view.rerender(<ParLeadReviewPanel cycle={cycle} employeeEmail="alex@example.com" />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    const backdrop = document.querySelector(".MuiBackdrop-root")!;
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(screen.getByText("Share Lead's Feedback?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(ratingMutate).not.toHaveBeenCalled();

    summarySavePending = false;
    await act(async () => finishSave());
    expect(ratingMutate).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ parLeadStatus: "SHARED" }) }),
      expect.anything(),
    );
  });

  it("isn't there for a member of the leadership team", () => {
    show({ parIsLeadershipEmployee: true });
    expect(screen.queryByText("360° summary")).not.toBeInTheDocument();
  });

  it("shows the shared summary read-only", () => {
    show({
      parLeadStatus: "SHARED",
      parLeadComment: encodeParComment("<p>Great cycle.</p>"),
      parLead360Summary: encodeParComment("<p>Colleagues see real ownership.</p>"),
    });
    expect(screen.getByText("360° summary")).toBeInTheDocument();
    expect(screen.getByText("Colleagues see real ownership.")).toBeInTheDocument();
    expect(suggestionAskedFor).toBe(false);
    expect(screen.queryByText("Suggested from 3 360° responses")).not.toBeInTheDocument();
  });
});

describe("ParLeadReviewPanel: sharing before the employee has", () => {
  const originalConfig = window.config;
  const setPar2 = (on: boolean) => {
    window.config = { ...(originalConfig ?? {}), ONE_WSO2_PREVIEW_FEATURES: { par2: on } } as Window["config"];
  };
  afterEach(() => {
    window.config = originalConfig;
  });
  const closedCycle = { ...cycle, parEmployeeDeadline: "2020-01-01" } as unknown as ParCycle;
  const ready = {
    parRatingId: 7,
    parCycleId: 2,
    parEmployeeEmail: "alex@example.com",
    parEmployeeStatus: "DRAFT",
    parLeadStatus: "DRAFT",
    parIsLeadershipEmployee: false,
    parRating: "Successful",
    parLeadComment: encodeParComment("<p>Great cycle.</p>"),
  } as ParRating;

  it("can share once the self-review has closed, with PAR 2.0", () => {
    setPar2(true);
    rating = ready;
    render(<ParLeadReviewPanel cycle={closedCycle} employeeEmail="alex@example.com" />);
    expect(screen.getByRole("button", { name: "Share" })).toBeEnabled();
  });

  it("turns Share on when the self-review closes while the panel is open, with PAR 2.0", () => {
    setPar2(true);
    rating = ready;
    // The self-review closes everywhere at 23:59:59 at UTC-12 on its deadline: 2026-12-02 11:59:59 UTC.
    vi.useFakeTimers({ now: new Date("2026-12-02T11:59:00Z") });
    try {
      const closing = { ...cycle, parEmployeeDeadline: "2026-12-01" } as unknown as ParCycle;
      render(<ParLeadReviewPanel cycle={closing} employeeEmail="alex@example.com" />);
      expect(screen.getByRole("button", { name: "Share" })).toBeDisabled();
      act(() => vi.advanceTimersByTime(60_000));
      expect(screen.getByRole("button", { name: "Share" })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("waits for the employee to share without PAR 2.0", () => {
    setPar2(false);
    rating = ready;
    render(<ParLeadReviewPanel cycle={closedCycle} employeeEmail="alex@example.com" />);
    expect(screen.getByRole("button", { name: "Share" })).toBeDisabled();
    expect(screen.queryByText(/You can share once/)).not.toBeInTheDocument();
  });
});
