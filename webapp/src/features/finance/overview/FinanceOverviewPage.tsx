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
import { OVERVIEW_GATE_APPS, useFinanceGate } from "../api/useFinanceGate";
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
  // The three dashboards this screen switches between. It never asks about
  // Master Data, so a slow answer from there should not keep this page blank
  // behind `gate.isResolving` below.
  const gate = useFinanceGate(true, OVERVIEW_GATE_APPS);
  // Derived-with-override, the same pattern NeedsYouTab's `expenseStage` and
  // CcApprovePage's `role` use: `picked` is null until someone chooses, and
  // the default is recomputed every render rather than captured once — a
  // plain `useState("cc")` would freeze on "cc" even after a card-less
  // reader's access resolved, since nothing ever re-triggers a `useState`
  // initializer. A reader with no CC card defaults to whichever of OPD or
  // Expense they actually hold; everyone else keeps the current "cc" default.
  //
  // Declared before the access guard below, not after: React's Rules of
  // Hooks — every hook has to run on every render, so this can't follow an
  // early return.
  //
  // Roles only — a failed lookup no longer counts for anything here, the
  // same as in `useFinanceGate`'s `finance-overview` case. Treating an error
  // as a reason to open this screen is what showed the whole entry to readers
  // holding no role at all whenever identity hiccuped, and took it away again
  // when identity recovered.
  const [picked, setPicked] = useState<OverviewTab | null>(null);
  const section: OverviewTab =
    picked ??
    (!gate.ccHasOwnCard && gate.opdFinance
      ? "opd"
      : !gate.ccHasOwnCard && !gate.opdFinance && gate.expenseFinance
        ? "expense"
        : "cc");

  // A second, narrower ask of the SAME hook — same query keys, so React Query
  // serves it from the cache `gate` above already populated rather than
  // firing a second request. This is what lets the page stop waiting on all
  // three backends: `gate` above still needs all three to pick the right
  // DEFAULT tab and to build the dropdown's option list, but rendering the
  // tab actually selected only ever needs that tab's own backend to answer.
  // A CC-only reader whose OPD/Expense queries are slow — or a CC-only
  // backend that is slow for someone who holds no CC role at all and will
  // never land on this tab — no longer holds up a page they were always
  // going to see.
  const sectionGate = useFinanceGate(true, [section]);

  // `canSee("finance-overview")` is an OR across all three roles, so it can
  // already read `true` from whichever backend answered first — it does not
  // need `gate.isResolving` to be false to KNOW someone belongs here, only to
  // rule out everyone who turns out not to. That split is the point: a
  // reader who clearly has access (their own tab's role already answered)
  // never waits on the other two just to be let in.
  const hasAccess = gate.canSee("finance-overview");
  if (!hasAccess && gate.isResolving) {
    return null;
  }
  // The rail hides this entry when `canSee("finance-overview")` is false,
  // but hiding a link is not access control — the route is still reachable
  // by a bookmark or a typed URL, the same reasoning `ClaimApprovalTabRoute`
  // guards each of ITS routes on. Without this check `visibleSections`
  // below would come back empty for that reader (every branch of its filter
  // false) and they'd see a dropdown with nothing in it instead of an
  // explicit answer. No data exposure either way — same as any finance
  // route today — just a dead-end UI this closes off.
  if (!hasAccess) {
    // CC erroring is not the same sentence as CC refusing: a reader denied
    // every role fairly hears "not for you"; a reader whose only possible
    // route in (CC) failed outright hears that it failed, with a way back.
    if (gate.ccErrored && !gate.opdFinance && !gate.expenseFinance) {
      return (
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={gate.retryCc} sx={{ textTransform: "none" }}>
              Retry
            </Button>
          }
        >
          Couldn&apos;t check your Credit Card access.
        </Alert>
      );
    }
    return <Alert severity="info">This isn&apos;t available for your role.</Alert>;
  }
  // Waits on the ONE backend the picked (or defaulted) tab actually needs —
  // not `gate.isResolving` above, which is three backends wide. Nothing
  // rendered while it resolves, matching `gate.isResolving`'s own guard: a
  // placeholder would be the one thing left to blink between "resolving" and
  // the dashboard underneath.
  if (sectionGate.isResolving) {
    return null;
  }

  // Same access this page's own default above already reads — each tab
  // offered only when there's a real reason to open it. Without this the
  // dropdown offered every reader every tab whether they held the role or
  // not, and picking one landed them on that dashboard's own denial notice
  // instead of a filtered list.
  //
  // Never empty here specifically: the `canSee("finance-overview")` guard
  // above already returned for anyone who fails every branch of this same
  // filter, so by this line at least one of them is guaranteed true.
  const visibleSections = OVERVIEW_SECTIONS.filter((s) =>
    s.value === "cc" ? gate.ccHasOwnCard : s.value === "opd" ? gate.opdFinance : gate.expenseFinance,
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
