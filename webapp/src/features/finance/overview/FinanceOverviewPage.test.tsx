/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Per-backend fixture: EACH of cc/opd/expense has its own resolved/role/error
// state, and `useFinanceGate` is mocked to answer only from whichever subset
// `needs` names — same contract the real hook has. This is what lets a test
// tell "the full gate (all three)" apart from "the section gate (one)",
// which is the exact distinction FinanceOverviewPage now depends on: the
// page waits on the full gate to decide ACCESS, but on the section gate
// alone to decide what to DRAW.
type Backend = "cc" | "opd" | "expense";
const backend = {
  cc: { resolved: true, role: false, errored: false },
  opd: { resolved: true, role: false, errored: false },
  expense: { resolved: true, role: false, errored: false },
};
const retryCc = vi.fn();

function resetBackends() {
  backend.cc = { resolved: true, role: false, errored: false };
  backend.opd = { resolved: true, role: false, errored: false };
  backend.expense = { resolved: true, role: false, errored: false };
  retryCc.mockClear();
}

vi.mock("../api/useFinanceGate", () => ({
  useFinanceGate: (_enabled = true, needs: Backend[] = ["cc", "opd", "expense"]) => ({
    isResolving: needs.some((app) => !backend[app].resolved),
    ccHasOwnCard: needs.includes("cc") && backend.cc.role,
    opdFinance: needs.includes("opd") && backend.opd.role,
    expenseFinance: needs.includes("expense") && backend.expense.role,
    ccErrored: needs.includes("cc") && backend.cc.errored,
    retryCc,
    canSee: (id: string) =>
      id === "finance-overview" &&
      ((needs.includes("cc") && backend.cc.role) ||
        (needs.includes("opd") && backend.opd.role) ||
        (needs.includes("expense") && backend.expense.role)),
  }),
  // Unused by this mocked gate directly, but the page imports it, so it has to exist.
  OVERVIEW_GATE_APPS: ["cc", "opd", "expense"],
}));
vi.mock("../cc/pages/CcDashboardPage", () => ({
  default: ({ headerActions }: { headerActions?: React.ReactNode }) => (
    <div data-testid="cc-dashboard">{headerActions}</div>
  ),
}));
vi.mock("../opd/dashboard/OpdDashboardScreen", () => ({
  default: ({ headerActions }: { headerActions?: React.ReactNode }) => (
    <div data-testid="opd-dashboard">{headerActions}</div>
  ),
}));
vi.mock("../expense/dashboard/ExpenseDashboardScreen", () => ({
  default: ({ headerActions }: { headerActions?: React.ReactNode }) => (
    <div data-testid="expense-dashboard">{headerActions}</div>
  ),
}));

const { default: FinanceOverviewPage } = await import("./FinanceOverviewPage");

interface Access {
  ccHasOwnCard?: boolean;
  opdFinance?: boolean;
  expenseFinance?: boolean;
  opdErrored?: boolean;
  ccErrored?: boolean;
}

/** A reader every backend has fully answered for, with the access given. */
function settled(access: Access) {
  backend.cc = { resolved: true, role: access.ccHasOwnCard ?? false, errored: access.ccErrored ?? false };
  backend.opd = { resolved: true, role: access.opdFinance ?? false, errored: access.opdErrored ?? false };
  backend.expense = { resolved: true, role: access.expenseFinance ?? false, errored: false };
}

/** A reader no backend has answered for yet — `access` is what each would say once it does. */
function resolving(access: Access = {}) {
  backend.cc = { resolved: false, role: access.ccHasOwnCard ?? false, errored: false };
  backend.opd = { resolved: false, role: access.opdFinance ?? false, errored: false };
  backend.expense = { resolved: false, role: access.expenseFinance ?? false, errored: false };
}

beforeEach(() => {
  resetBackends();
});

const aDashboard = () =>
  screen.queryByTestId("cc-dashboard") ??
  screen.queryByTestId("opd-dashboard") ??
  screen.queryByTestId("expense-dashboard");

// The reason this screen exists in the shape it does: it is the content pane
// for a rail row that is itself hidden until the gate settles. Anything drawn
// here before that answer arrives is something the reader watches appear and
// then be taken away again.
describe("while the backends are still answering", () => {
  it("draws nothing at all — no dashboard, no refusal, no switcher", () => {
    resolving({ ccHasOwnCard: true });

    const { container } = render(<FinanceOverviewPage />);

    expect(container).toBeEmptyDOMElement();
    expect(aDashboard()).not.toBeInTheDocument();
    expect(screen.queryByText(/isn't available for your role/)).not.toBeInTheDocument();
  });
});

// THE regression this screen was reported for. A reader with no card and no
// OPD role must never see a dashboard — not for one render on the way to the
// refusal, which is what "it blinks and comes back" was.
describe("a reader with neither a card nor an OPD role", () => {
  it("never sees a dashboard, from the first render to the last", () => {
    resolving();
    const { container, rerender } = render(<FinanceOverviewPage />);

    // Resolving: nothing.
    expect(aDashboard()).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();

    // Settled, and the answer is no.
    settled({});
    rerender(<FinanceOverviewPage />);

    expect(aDashboard()).not.toBeInTheDocument();
    expect(screen.getByText(/isn't available for your role/)).toBeInTheDocument();
  });

  // Hiding the rail row is not access control — the route is still reachable
  // by a bookmark or a typed URL.
  it("is refused outright rather than shown an empty switcher", () => {
    settled({});
    render(<FinanceOverviewPage />);

    expect(screen.getByText(/isn't available for your role/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});

// A reader holding one side is not offered the other: picking it would only
// land them on that dashboard's own denial notice.
describe("what the switcher offers", () => {
  it("opens the CC dashboard, and offers only it, for a card owner", () => {
    settled({ ccHasOwnCard: true });
    render(<FinanceOverviewPage />);

    expect(screen.getByTestId("cc-dashboard")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("Credit Card");
    expect(screen.queryByTestId("opd-dashboard")).not.toBeInTheDocument();
  });

  // Lands straight on the dashboard they can actually use, rather than the
  // "cc" default they would have nothing to see on.
  it("opens the OPD dashboard for an OPD-only approver", () => {
    settled({ opdFinance: true });
    render(<FinanceOverviewPage />);

    expect(screen.getByTestId("opd-dashboard")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("OPD Claims");
    expect(screen.queryByTestId("cc-dashboard")).not.toBeInTheDocument();
  });

  it("offers both to a reader holding both", () => {
    settled({ ccHasOwnCard: true, opdFinance: true });
    render(<FinanceOverviewPage />);

    expect(screen.getByTestId("cc-dashboard")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  // A failed lookup is not a role. `foldIdentityError` reports every finance
  // query as `isError` whenever identity itself fails to resolve, so opening
  // this screen on an error opened it for readers holding nothing at all —
  // and closed it again when identity recovered, which is the blinking.
  it("stays shut for a reader whose OPD lookup merely failed", () => {
    settled({ opdErrored: true });
    render(<FinanceOverviewPage />);

    expect(aDashboard()).not.toBeInTheDocument();
    expect(screen.getByText(/isn't available for your role/)).toBeInTheDocument();
  });

  // The flip side: a real approver still gets in while OPD is having a bad
  // minute, and lands on the tab with the retry rather than the empty one.
  it("still opens the OPD tab for a real approver whose lookup failed", () => {
    settled({ opdFinance: true, opdErrored: true });
    render(<FinanceOverviewPage />);

    expect(screen.getByTestId("opd-dashboard")).toBeInTheDocument();
  });

  // Lands straight on Expense Claims for a reader who holds only that role —
  // same reasoning as the OPD-only case above, extended to the third tab.
  it("opens the Expense Claims dashboard for an expense-finance-only reader", () => {
    settled({ expenseFinance: true });
    render(<FinanceOverviewPage />);

    expect(screen.getByTestId("expense-dashboard")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("Expense Claims");
    expect(screen.queryByTestId("cc-dashboard")).not.toBeInTheDocument();
    expect(screen.queryByTestId("opd-dashboard")).not.toBeInTheDocument();
  });

  it("offers all three to a reader holding every role", async () => {
    settled({ ccHasOwnCard: true, opdFinance: true, expenseFinance: true });
    render(<FinanceOverviewPage />);

    // MUI's Select renders its options into a closed popper — not in the DOM
    // at all until opened — so the combobox has to be opened first.
    await userEvent.click(screen.getByRole("combobox"));
    const options = (await screen.findAllByRole("option")).map((o) => o.textContent);
    expect(options).toEqual(["Credit Card", "OPD Claims", "Expense Claims"]);
  });

  // Picking Expense Claims would only ever land on its own denial notice for
  // a reader who does not hold the role — the dropdown must not offer it.
  it("does not offer Expense Claims to a reader without the role", async () => {
    settled({ ccHasOwnCard: true });
    render(<FinanceOverviewPage />);

    await userEvent.click(screen.getByRole("combobox"));
    await screen.findAllByRole("option");
    expect(screen.queryByText("Expense Claims")).not.toBeInTheDocument();
  });
});

// THE fix this page was reviewed for: a slow backend outside the active tab
// must not hold up the tab that IS active. `resolving()` below leaves CC
// unresolved throughout — if the page still waited on the full three-backend
// gate to draw anything, these would see nothing, the same way the
// "while the backends are still answering" tests above do on purpose.
describe("a slow backend outside the selected tab", () => {
  it("still draws the OPD dashboard while CC alone remains unresolved", () => {
    backend.cc = { resolved: false, role: false, errored: false };
    backend.opd = { resolved: true, role: true, errored: false };
    backend.expense = { resolved: true, role: false, errored: false };

    render(<FinanceOverviewPage />);

    expect(screen.getByTestId("opd-dashboard")).toBeInTheDocument();
  });

  it("still draws the Expense dashboard while CC alone remains unresolved", () => {
    backend.cc = { resolved: false, role: false, errored: false };
    backend.opd = { resolved: true, role: false, errored: false };
    backend.expense = { resolved: true, role: true, errored: false };

    render(<FinanceOverviewPage />);

    expect(screen.getByTestId("expense-dashboard")).toBeInTheDocument();
  });

  // The converse of the above: picking CC specifically still waits on CC's
  // own answer, same as any tab waits on its own backend. Access is already
  // known here (CC's eventual role is already true in this fixture), so this
  // is the section gate's own wait, not the earlier access-level one — still
  // nothing drawn, for the same reason a placeholder would be the one thing
  // left to blink on the way to the dashboard underneath.
  it("does not draw the CC dashboard while CC itself is still unresolved", () => {
    backend.cc = { resolved: false, role: true, errored: false };
    backend.opd = { resolved: true, role: false, errored: false };
    backend.expense = { resolved: true, role: false, errored: false };

    const { container } = render(<FinanceOverviewPage />);

    expect(aDashboard()).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});

// Distinct from "not for your role": a reader refused because CC's OWN
// lookup failed outright is told that, and given a way back, rather than the
// same sentence a genuinely roleless reader gets.
describe("a reader shut out by a failed CC lookup, not a missing role", () => {
  it("shows the CC failure with a retry instead of the generic refusal", () => {
    settled({ ccErrored: true });
    render(<FinanceOverviewPage />);

    expect(screen.getByText(/Couldn.t check your Credit Card access/)).toBeInTheDocument();
    expect(screen.queryByText(/isn't available for your role/)).not.toBeInTheDocument();
  });

  it("retries CC when that button is pressed", async () => {
    settled({ ccErrored: true });
    render(<FinanceOverviewPage />);

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retryCc).toHaveBeenCalledTimes(1);
  });

  // A role elsewhere still gets the ordinary generic refusal, not the CC
  // error banner — CC failing is only the reason to say so when CC was the
  // reader's only possible way in.
  it("falls back to the generic refusal when another role could have opened it anyway", () => {
    settled({ ccErrored: true, opdFinance: false, expenseFinance: false });
    // Same scenario as above already covers the error path; this confirms
    // a reader who ALSO holds a real role never sees the error banner at all,
    // because hasAccess is already true and the error branch is unreachable.
    backend.opd.role = true;
    render(<FinanceOverviewPage />);

    expect(screen.queryByText(/Couldn.t check your Credit Card access/)).not.toBeInTheDocument();
    expect(screen.getByTestId("opd-dashboard")).toBeInTheDocument();
  });
});
