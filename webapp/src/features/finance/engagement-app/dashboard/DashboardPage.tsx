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
import { Box, Button, Chip, Skeleton, Snackbar, Stack } from "@wso2/oxygen-ui";
import { SlidersHorizontalIcon } from "@wso2/oxygen-ui-icons-react";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import { localIsoDate } from "@utils/localDate";
import { useAllocationsToday, useDashboard, useDashboardSections, useReferenceData, useTravelCosts } from "../api/useEngagementApi";
import { useEngagementAccess } from "../api/useEngagementUserInfo";
import EaPage from "../components/EaPage";
import { TableSkeleton } from "../components/EaSkeletons";
import { Empty, Failed } from "../components/ListCard";
import { ALLOC } from "../model/engagementAccess";
import { fmtDate } from "../model/format";
import { useListView } from "../model/useListView";
import AgentDashboard from "./AgentDashboard";
import { KpiRow } from "./dashboardParts";
import { costParams } from "./travelCosts/costView";
import { useCostCsv } from "./travelCosts/useCostCsv";
import { useTravelCostView } from "./travelCosts/useTravelCostView";
import { legacyWidgets } from "./widgets/layout";
import ManageWidgetsDialog from "./widgets/ManageWidgetsDialog";
import { sectionOfWidget, WIDGET_IDS, widgetById } from "./widgets/registry";
import type { DashboardSectionKey, SectionState, WidgetCtx, WidgetDef } from "./widgets/types";
import WidgetGrid from "./widgets/WidgetGrid";
import { extraSections, mergeDashboards, widgetState } from "./widgets/widgetState";
import { orderWidgets, setVisible, togglePinned, useWidgetPrefs, visibleIds } from "./widgets/widgetPrefs";

const HIDDEN_NOTICE = "Widget hidden. Manage Widgets brings it back.";

/** Dashboard: the first screen people land on, built from the widgets each person's privileges allow and that they have chosen to keep. */
export default function DashboardPage(): JSX.Element {
  const access = useEngagementAccess();
  const user = useAsgardeoUser();
  const today = localIsoDate();
  const list = useListView();
  const bu = list.filters.businessUnit ?? "";
  const date = list.filters.date ?? "";
  const dashboard = useDashboard();
  const ref = useReferenceData();
  const { prefs, update, reset } = useWidgetPrefs(user.email);
  const [manage, setManage] = useState(false);
  const [notice, setNotice] = useState("");
  const costView = useTravelCostView();
  const base = dashboard.data;

  // What the backend lets this person see. An older backend sends no list: offer what came back.
  const serverList = base?.widgets;
  const showToday = access.p.a.has(ALLOC.DASHBOARD) && !access.isAgent;
  const allowed = useMemo(() => (serverList ?? (base ? legacyWidgets(base, showToday) : [])).filter((w) => widgetById(w.id)), [serverList, base, showToday]);
  const visible = useMemo(() => orderWidgets(visibleIds(allowed, prefs), prefs.pinned, WIDGET_IDS), [allowed, prefs]);
  const defs = useMemo(() => visible.map((id) => widgetById(id)).filter((d): d is WidgetDef => Boolean(d)), [visible]);

  // A widget turned on that is not on by default needs its section fetched on top of the default call.
  const extra = useMemo(() => (serverList ? extraSections(allowed, visible, sectionOfWidget) : []), [serverList, allowed, visible]);
  const extraQuery = useDashboardSections(extra, Boolean(base));
  const merged = useMemo(() => mergeDashboards(base, extraQuery.data), [base, extraQuery.data]);
  const covered = useMemo(() => new Set(allowed.filter((w) => w.defaultOn).map((w) => sectionOfWidget(w.id))), [allowed]);

  const section = useCallback(
    (key: DashboardSectionKey): SectionState => {
      if (!serverList || covered.has(key)) return base?.failed.includes(key) ? { status: "failed" } : { status: "loaded" };
      if (extraQuery.isError) return { status: "failed", error: extraQuery.error };
      if (!extraQuery.data) return { status: "loading" };
      return extraQuery.data.failed.includes(key) ? { status: "failed" } : { status: "loaded" };
    },
    [serverList, covered, base, extraQuery.isError, extraQuery.error, extraQuery.data],
  );

  // Allocations Today has its own call (a date and a business unit).
  const todayOn = visible.includes("allocations-today");
  const buId = bu ? ref.data?.businessUnitIds[bu] : undefined;
  const allocationsToday = useAllocationsToday({ date: date || undefined, businessUnitId: buId }, todayOn && (!bu || buId !== undefined));

  // Travel Costs: one summary call for the controls bar and every cost widget.
  const costOn = defs.some((d) => d.group === "travelCosts");
  const params = useMemo(() => costParams(costView.view), [costView.view]);
  const costQuery = useTravelCosts(params, costOn);
  const range = useMemo(() => ({ from: costView.view.period.from, to: costView.view.period.to }), [costView.view.period]);
  const exportCsv = useCostCsv(params, range, setNotice);

  if (dashboard.isPending) {
    return (
      <EaPage title="Dashboard">
        <Stack spacing={2}>
          <KpiRow>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} variant="rounded" height={64} aria-busy="true" />
            ))}
          </KpiRow>
          <TableSkeleton columns={4} rows={5} />
        </Stack>
      </EaPage>
    );
  }
  // A failed refetch keeps the last good data, and then the widgets stay and the failure is a notice above them.
  if (!dashboard.data) {
    return (
      <EaPage title="Dashboard">
        <Failed what="the dashboard" error={dashboard.error} onRetry={() => void dashboard.refetch()} retrying={dashboard.isFetching} />
      </EaPage>
    );
  }
  const d = dashboard.data;
  if (d.agency) return <AgentDashboard d={d} />;
  // One "today": the date the backend computed for (UTC), not a second one from the browser clock.
  const businessDate = d.date ?? today;

  const ctx: WidgetCtx = {
    today,
    businessDate,
    dashboard: merged,
    section,
    // Each widget retries the query that owns its section: the base call for the default ones, the extra call for the others.
    retry: (key) => {
      const own = !key || !serverList || covered.has(key);
      if (own) void dashboard.refetch();
      if ((!key || !own) && extra.length) void extraQuery.refetch();
    },
    retrying: dashboard.isFetching || extraQuery.isFetching,
    allocationsToday: { businessUnit: bu, date, query: allocationsToday, change: (next) => list.setFilters({ ...list.filters, ...next }) },
    cost: { view: costView.view, set: costView.set, drill: costView.drill, params, query: costQuery, exportCsv },
  };
  // A widget whose data the backend left out of a loaded section is not drawn.
  const shownDefs = defs.filter((d) => widgetState(d, ctx).kind !== "absent");
  const first = user.givenName ?? user.displayName?.split(" ")[0];
  const hidden = allowed.length - visible.length;
  const refOf = (id: string) => allowed.find((w) => w.id === id);

  return (
    <EaPage
      title="Dashboard"
      subtitle={`Welcome back${first ? `, ${first}` : ""}. Here is where engagements, allocations and travel stand on ${fmtDate(businessDate)}.`}
      actions={
        allowed.length ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            {hidden > 0 ? <Chip size="small" label={`${hidden} hidden`} /> : null}
            <Button variant="outlined" size="small" startIcon={<SlidersHorizontalIcon size={15} />} onClick={() => setManage(true)} sx={{ fontWeight: 600 }}>
              Manage Widgets
            </Button>
          </Stack>
        ) : undefined
      }
    >
      {dashboard.isError ? <Failed what="the latest dashboard" error={dashboard.error} onRetry={() => void dashboard.refetch()} retrying={dashboard.isFetching} /> : null}
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
