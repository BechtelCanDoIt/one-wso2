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

import { useCallback, type JSX } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { Stack, Tab, Tabs } from "@wso2/oxygen-ui";
import PageHeader from "@features/sales/cado2/components/page-header/PageHeader";
import { cado2Paths, type Cado2InsightsTab } from "@features/sales/cado2/cado2Paths";
import type { ReportFilters } from "../api/insightsTypes";
import { filtersFromSearch, filtersToSearch } from "../utils/reportFilters";
import ApprovalOperationsTab from "../components/ApprovalOperationsTab";
import QuoteReportTab from "../components/QuoteReportTab";

const TABS: readonly { value: Cado2InsightsTab; label: string }[] = [
  { value: "operations", label: "Approval Operations" },
  { value: "report", label: "Quote Report" },
];

/**
 * CadO2 Insights (D106), for Deal Desk and the roles above it, and Admins
 * (D105): one global view. Each tab is a route; a tab's filters live in the
 * URL, so a view can be shared as a link.
 */
export default function InsightsPage(): JSX.Element {
  const { tab } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const filters = filtersFromSearch(params);
  const changeReport = useCallback(
    (patch: Partial<ReportFilters>) => setParams(filtersToSearch({ ...filtersFromSearch(params), ...patch })),
    [params, setParams],
  );
  const region = params.get("region") ?? "";
  const changeRegion = useCallback(
    (r: string) => setParams(r ? new URLSearchParams({ region: r }) : new URLSearchParams()),
    [setParams],
  );

  if (!TABS.some((t) => t.value === tab)) return <Navigate to={cado2Paths.insights()} replace />;

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Insights" />
      <Tabs
        value={tab}
        onChange={(_, v: Cado2InsightsTab) => navigate(cado2Paths.insights(v))}
        aria-label="Insights views"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        {TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} />
        ))}
      </Tabs>
      {tab === "operations" ? (
        <ApprovalOperationsTab region={region} onRegionChange={changeRegion} />
      ) : (
        <QuoteReportTab filters={filters} onChange={changeReport} />
      )}
    </Stack>
  );
}
