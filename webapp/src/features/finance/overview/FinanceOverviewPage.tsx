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

import { useState } from "react";
import { Alert, Button, MenuItem, Select } from "@wso2/oxygen-ui";
import { useFinanceGate } from "../api/useFinanceGate";
import CcDashboardPage from "../cc/pages/CcDashboardPage";
import OpdDashboardScreen from "../opd/dashboard/OpdDashboardScreen";
import ExpenseDashboardScreen from "../expense/dashboard/ExpenseDashboardScreen";

type OverviewTab = "cc" | "opd" | "expense";

// "Credit Card", not "Credit Card Expenses" — that name already belongs to
// the app-section entry in the Finance rail (Pending Submissions, Approve
// Submissions, ...), a different destination from this dashboard. Same
// label in two places meaning two different things is exactly the
// confusion this drops.
const OVERVIEW_SECTIONS: { value: OverviewTab; label: string }[] = [
  { value: "cc", label: "Credit Card" },
  { value: "opd", label: "OPD Claims" },
  { value: "expense", label: "Expense Claims" },
];

/**
 * Finance → Overview. Used to be a rail group that expanded into separate
 * rows per dashboard, each its own click before you reached it. This is the
 * one screen the rail now sends you to; the dropdown does the switching that
 * used to be a second click in the sidebar.
 *
 * No header of its own — the dropdown TAKES THE PLACE of whichever
 * dashboard's own eyebrow chip would show, via `FinanceShell`'s `actions`
 * slot (see `headerActions` below; `FinanceShell` renders `actions ?? <Chip
 * .../>`, never both) — the dropdown already says which section is showing,
 * so the chip would only repeat it.
 *
 * No dashboard changed to get here — each is still the exact same
 * default-exported page (own eyebrow chip, title, config-gating, loading and
 * error states), just chosen by the dropdown instead of a route. Both
 * `OpdDashboardScreen` and `ExpenseDashboardScreen` still enforce their own
 * finance-approver role check internally, so someone without it sees that
 * screen's own notice, not a missing option.
 */
export default function FinanceOverviewPage() {
  // Three single-backend asks, each independently scoped rather than one
  // three-wide gate — this is what lets every check below wait on only the
  // ONE backend it actually needs, instead of a slow backend nobody's
  // decision depends on holding up the page. Deduped against each other by
  // React Query's own query-key cache, so this costs no extra request over a
  // single combined call.
  const opdGate = useFinanceGate(true, ["opd"]);
  const expenseGate = useFinanceGate(true, ["expense"]);
  const ccGate = useFinanceGate(true, ["cc"]);

  // `picked` is null until someone chooses, or until the default below
  // settles and locks itself in (see the effect further down) — from then on
  // this is the only thing `section` reads, and the priority computation
  // underneath it is never consulted again for this mount.
  //
  // Declared before the access guard below, not after: React's Rules of
  // Hooks — every hook has to run on every render, so this can't follow an
  // early return.
  const [picked, setPicked] = useState<OverviewTab | null>(null);

  // Priority order: OPD, then Expense, then CC — reviewed into this order
  // because OPD is the common case. Staged rather than flat, so a role that
  // ranks ABOVE another is never skipped just because it hasn't answered
  // yet: Expense is not consulted at all until OPD has definitively said no,
  // and CC (the last resort) not until Expense has too. `null` means "not
  // decidable yet" at that stage.
  const defaultSection: OverviewTab | null = opdGate.isResolving
    ? null
    : opdGate.opdFinance
      ? "opd"
      : expenseGate.isResolving
        ? null
        : expenseGate.expenseFinance
          ? "expense"
          : ccGate.isResolving
            ? null
            : "cc";

  // Locks the FIRST dashboard this mount ever decided on, the moment it's
  // known — adjusting state during render rather than in an effect, the
  // pattern React's own docs recommend for "remember this, once" (no extra
  // render-commit-effect round trip, and nothing to clean up). Guarded by
  // `picked === null` so it only ever fires the one time: without this, a
  // role that resolves (or simply changes, on a background refetch) after a
  // lower-priority one already committed would silently swap what the reader
  // is looking at — reviewed as "Overview ... should never switch on its
  // own".
  if (picked === null && defaultSection !== null) {
    setPicked(defaultSection);
  }
  const section = picked ?? defaultSection;

  // An OR across all three — true as soon as ANY one resolves and grants
  // access, without needing the other two to also answer first. A reader
  // whose own role already came back never waits on backends that were
  // never going to change their answer.
  const hasAccess = ccGate.ccHasOwnCard || opdGate.opdFinance || expenseGate.expenseFinance;
  const stillDeciding = opdGate.isResolving || expenseGate.isResolving || ccGate.isResolving;
  if (!hasAccess && stillDeciding) {
    return null;
  }
  // The rail hides this entry when nobody has a role, but hiding a link is
  // not access control — the route is still reachable by a bookmark or a
  // typed URL, the same reasoning `ClaimApprovalTabRoute` guards each of ITS
  // routes on. No data exposure either way — same as any finance route
  // today — just a dead-end UI this closes off.
  if (!hasAccess) {
    // An error is not the same sentence as a refusal: a reader denied every
    // role fairly hears "not for you"; a reader whose lookup failed outright
    // hears that it failed, with a way back. Each backend gets its own
    // message rather than one generic "something failed", so Retry can
    // target the one that actually needs it.
    const failure = ccGate.ccErrored
      ? { label: "Credit Card", retry: ccGate.retryCc }
      : opdGate.opdErrored
        ? { label: "OPD Claims", retry: opdGate.retryOpd }
        : expenseGate.expenseErrored
          ? { label: "Expense Claims", retry: expenseGate.retryExpense }
          : null;
    if (failure) {
      return (
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={failure.retry} sx={{ textTransform: "none" }}>
              Retry
            </Button>
          }
        >
          Couldn&apos;t check your {failure.label} access.
        </Alert>
      );
    }
    return <Alert severity="info">This isn&apos;t available for your role.</Alert>;
  }
  // Still deciding the default (every backend above the eventual answer has
  // to resolve first — see `defaultSection`) or picked but the picked tab's
  // own backend hasn't answered yet. Nothing rendered either way: a
  // placeholder would be the one thing left to blink on the way to the
  // dashboard underneath.
  const sectionGate =
    section === "opd" ? opdGate : section === "expense" ? expenseGate : section === "cc" ? ccGate : null;
  if (sectionGate === null || sectionGate.isResolving) {
    return null;
  }

  // Same access this page's own default above already reads — each tab
  // offered only when there's a real reason to open it. Without this the
  // dropdown offered every reader every tab whether they held the role or
  // not, and picking one landed them on that dashboard's own denial notice
  // instead of a filtered list.
  //
  // Never empty here specifically: `hasAccess` above is already true, and it
  // can only be true because one of these three flags is — so by this line
  // at least one of them is guaranteed true, even if the other two are still
  // resolving (and so, for now, read as the false they will settle into).
  const visibleSections = OVERVIEW_SECTIONS.filter((s) =>
    s.value === "cc" ? ccGate.ccHasOwnCard : s.value === "opd" ? opdGate.opdFinance : expenseGate.expenseFinance,
  );

  const switcher = (
    <Select
      size="small"
      value={section}
      onChange={(e) => setPicked(e.target.value as OverviewTab)}
      inputProps={{ "aria-label": "Overview section" }}
      sx={{ minWidth: 220 }}
    >
      {visibleSections.map((s) => (
        <MenuItem key={s.value} value={s.value}>
          {s.label}
        </MenuItem>
      ))}
    </Select>
  );

  if (section === "cc") return <CcDashboardPage headerActions={switcher} />;
  if (section === "opd") return <OpdDashboardScreen headerActions={switcher} />;
  return <ExpenseDashboardScreen headerActions={switcher} />;
}
