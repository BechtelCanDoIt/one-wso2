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

import { useCallback, useMemo, useState, type JSX } from "react";
import { Badge, Box, Button, Card, Skeleton, Snackbar, Tooltip } from "@wso2/oxygen-ui";
import { SlidersHorizontalIcon } from "@wso2/oxygen-ui-icons-react";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import { localIsoDate } from "@utils/localDate";
import {
  useAllocationsToday,
  useDashboardCatalogue,
  useDashboardSectionGroups,
  useReferenceData,
  useTravelCosts,
} from "../api/useEngagementApi";
import type { Dashboard } from "../api/engagementTypes";
import EaPage from "../components/EaPage";
import { DelayedSkeleton } from "../components/EaSkeletons";
import { Empty, Failed } from "../components/ListCard";
import { fmtDate } from "../model/format";
import { useListView } from "../model/useListView";
import AgentDashboard from "./AgentDashboard";
import { costParams } from "./travelCosts/costView";
import { useCostCsv } from "./travelCosts/useCostCsv";
import { useTravelCostView } from "./travelCosts/useTravelCostView";
import ManageWidgetsDialog from "./widgets/ManageWidgetsDialog";
import { sectionOfWidget, WIDGET_IDS, widgetById } from "./widgets/registry";
import type { FilterKey } from "./travelCosts/costView";
import type { CostCtx, DashboardSectionKey, SectionState, WidgetCtx, WidgetDef } from "./widgets/types";
import WidgetGrid from "./widgets/WidgetGrid";
import { Rows } from "./widgets/WidgetSkeletons";
import { mergeDashboards, sectionGroups, widgetState } from "./widgets/widgetState";
import { orderWidgets, setVisible, togglePinned, useWidgetPrefs, visibleIds } from "./widgets/widgetPrefs";

const HIDDEN_NOTICE = "Widget hidden. Manage Widgets brings it back.";

/**
 * What stands in for the widgets until the catalogue says which there are (a first visit; a reload draws the person's last known list at
 * once). Nobody's widgets are known yet, so it is one plain card, not a guess at tiles or tables that many people (an employee with a single
 * widget, a person with none) would never get. Shown only if the catalogue is not quick, in space reserved from the start.
 */
function CatalogueSkeleton(): JSX.Element {
  return (
    <DelayedSkeleton minHeight={220}>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Skeleton variant="text" width={180} sx={{ fontSize: 15.5 }} />
        <Box sx={{ mt: 1.5 }}>
          <Rows rows={3} />
        </Box>
      </Card>
    </DelayedSkeleton>
  );
}

/** Dashboard: the first screen people land on, built from the widgets each person's privileges allow and that they have chosen to keep. */
export default function DashboardPage(): JSX.Element {
  const user = useAsgardeoUser();
  const today = localIsoDate();
  const list = useListView();
  const bu = list.filters.businessUnit ?? "";
  const date = list.filters.date ?? "";
  // The widget catalogue first, then each widget's section. A travel agent's answer is the agent dashboard itself.
  const catalogue = useDashboardCatalogue();
  const ref = useReferenceData();
  const { prefs, update, reset } = useWidgetPrefs(user.email);
  const [manage, setManage] = useState(false);
  const [notice, setNotice] = useState("");
  const base = catalogue.data;
  // One "today" for the whole page: the date the backend computed for (UTC), not a second one from the browser clock, which can be a day ahead or behind.
  // Only an answer from this session has it (the copy kept for a reload has none), and what depends on it waits for it, so the default period never moves.
  const freshDate = base?.date || undefined;
  const businessDate = freshDate || today;
  const costView = useTravelCostView(freshDate);
  const [lastDrill, setLastDrill] = useState<CostCtx["lastDrill"]>();
  const { drill } = costView;
  const drillAndShow = useCallback(
    (key: FilterKey, value: string) => {
      drill(key, value);
      setLastDrill((p) => ({ id: (p?.id ?? 0) + 1, key, value }));
    },
    [drill],
  );

  // What the backend lets this person see (the last known list while the fresh one is on its way).
  const serverList = base?.widgets;
  const allowed = useMemo(() => (serverList ?? []).filter((w) => widgetById(w.id)), [serverList]);
  const visible = useMemo(() => orderWidgets(visibleIds(allowed, prefs), prefs.pinned, WIDGET_IDS), [allowed, prefs]);
  const defs = useMemo(() => visible.map((id) => widgetById(id)).filter((d): d is WidgetDef => Boolean(d)), [visible]);

  // Each widget's data: one request per group of sections, all at once, so the slowest does not hold back the rest.
  const groups = useMemo(() => sectionGroups(allowed, visible, sectionOfWidget), [allowed, visible]);
  const groupQueries = useDashboardSectionGroups(
    groups.map((g) => g.sections),
    groups.map((g) => g.needed && Boolean(base)),
  );
  const merged = useMemo(() => groupQueries.reduce<Dashboard | undefined>((all, q) => mergeDashboards(all, q.data), base), [base, groupQueries]);

  const section = useCallback(
    (key: DashboardSectionKey): SectionState => {
      const i = groups.findIndex((g) => g.sections.includes(key));
      const q = groupQueries[i];
      if (!q) return { status: "loading" };
      if (q.isError && !q.data) return { status: "failed", error: q.error };
      if (!q.data) return { status: "loading" };
      return q.data.failed.includes(key) ? { status: "failed" } : { status: "loaded" };
    },
    [groups, groupQueries],
  );

  // Allocations Today has its own call (a date and a business unit).
  const todayOn = visible.includes("allocations-today");
  const buId = bu ? ref.data?.businessUnitIds[bu] : undefined;
  const allocationsToday = useAllocationsToday({ date: date || undefined, businessUnitId: buId }, todayOn && (!bu || buId !== undefined));

  // Travel Costs: one summary call for the controls bar and every cost widget, asked once the business date is known.
  const costOn = defs.some((d) => d.group === "travelCosts");
  const params = useMemo(() => costParams(costView.view), [costView.view]);
  const costQuery = useTravelCosts(params, costOn && Boolean(freshDate));
  const range = useMemo(() => ({ from: costView.view.period.from, to: costView.view.period.to }), [costView.view.period]);
  const exportCsv = useCostCsv(params, range, setNotice);

  if (base?.agency) return <AgentDashboard d={base} />;

  const first = user.givenName ?? user.displayName?.split(" ")[0];
  const header = {
    title: "Dashboard",
    subtitle: `Welcome back${first ? `, ${first}` : ""}. Here is where engagements, allocations and travel stand on ${fmtDate(businessDate)}.`,
  };
  // A failed refetch keeps the last good catalogue, and then the widgets stay and the failure is a notice above them.
  if (!base) {
    return (
      <EaPage {...header} actions={undefined}>
        {catalogue.isError ? (
          <Failed what="the dashboard" error={catalogue.error} onRetry={() => void catalogue.refetch()} retrying={catalogue.isFetching} />
        ) : (
          <CatalogueSkeleton />
        )}
      </EaPage>
    );
  }

  const ctx: WidgetCtx = {
    today,
    businessDate,
    dashboard: merged,
    section,
    // Each widget retries the request that owns its section; with no section, every one.
    retry: (key) => {
      if (!key) {
        void catalogue.refetch();
        groupQueries.forEach((q) => void q.refetch());
        return;
      }
      const i = groups.findIndex((g) => g.sections.includes(key));
      void groupQueries[i]?.refetch();
    },
    retrying: groupQueries.some((q) => q.isFetching),
    allocationsToday: { businessUnit: bu, date, query: allocationsToday, change: (next) => list.setFilters({ ...list.filters, ...next }) },
    cost: { view: costView.view, set: costView.set, drill: drillAndShow, lastDrill, params, query: costQuery, ready: Boolean(freshDate), exportCsv },
  };
  // A widget whose data the backend left out of a loaded section is not drawn.
  const shownDefs = defs.filter((d) => widgetState(d, ctx).kind !== "absent");
  const hidden = allowed.length - visible.length;
  // The count is of widgets turned on, not of widgets with data, so the wording says enabled.
  const enabledText = hidden > 0 ? `${visible.length} of ${allowed.length} widgets enabled, ${hidden} hidden` : `All ${allowed.length} widgets enabled`;
  const refOf = (id: string) => allowed.find((w) => w.id === id);

  return (
    <EaPage
      {...header}
      actions={
        allowed.length ? (
          <Tooltip title={enabledText}>
            <Badge color="primary" badgeContent={visible.length} showZero>
              <Button variant="outlined" size="small" aria-label={`Manage Widgets, ${enabledText}`} startIcon={<SlidersHorizontalIcon size={15} />} onClick={() => setManage(true)} sx={{ fontWeight: 600 }}>
                Manage Widgets
              </Button>
            </Badge>
          </Tooltip>
        ) : undefined
      }
    >
      {catalogue.isError ? <Failed what="the latest dashboard" error={catalogue.error} onRetry={() => void catalogue.refetch()} retrying={catalogue.isFetching} /> : null}
      {shownDefs.length ? (
        <WidgetGrid
          defs={shownDefs}
          ctx={ctx}
          pinned={prefs.pinned}
          canDownloadTransactions={allowed.some((w) => w.id === "tc-lines")}
          onHide={(id) => {
            const r = refOf(id);
            if (r) update((p) => setVisible(p, r, false));
            setNotice(HIDDEN_NOTICE);
          }}
          onPin={(id) => update((p) => togglePinned(p, id))}
        />
      ) : !allowed.length ? (
        <Box sx={{ py: 4 }}>
          <Empty title="No widgets are available to you" body="Nothing on this dashboard is open to your roles." />
        </Box>
      ) : (
        <Box sx={{ py: 4 }}>
          <Empty
            title={defs.length ? "None of your widgets has data" : "Every widget is hidden"}
            body={defs.length ? "The widgets you chose have nothing to show. Manage Widgets lets you pick others." : "Manage Widgets brings them back."}
            action={
              <Button variant="contained" size="small" onClick={() => setManage(true)}>
                Manage Widgets
              </Button>
            }
          />
        </Box>
      )}
      {manage ? <ManageWidgetsDialog allowed={allowed} prefs={prefs} onChange={update} onReset={reset} onClose={() => setManage(false)} /> : null}
      <Snackbar open={Boolean(notice)} autoHideDuration={6000} onClose={() => setNotice("")} message={notice} />
    </EaPage>
  );
}
