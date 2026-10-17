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

import { Box } from "@wso2/oxygen-ui";
import { Navigate, Outlet } from "react-router";
import RoutedTabs, { type RoutedTabDef } from "@components/routed-tabs/RoutedTabs";
import AmplifyShell from "../components/AmplifyShell";

const BASE = "/amplify/po";

const TABS: readonly RoutedTabDef[] = [
  { segment: "review", label: "Review queue" },
  { segment: "dashboard", label: "Dashboard" },
  { segment: "point-rules", label: "Point rules" },
];

/**
 * PO Review's frame: one shell (so the role gate runs once), a tab bar whose
 * tabs are URLs, and the tab bodies as nested routes. The tabs are routes
 * rather than `useState` so the dashboard is linkable and survives a refresh —
 * the same reason RoutedTabs exists.
 */
export default function AmplifyPoPage() {
  return (
    <AmplifyShell
      title="PO Review"
      subtitle="Claimed posts waiting on a decision, the standing numbers, and the point rules behind them."
      requireRole="po"
    >
      {() => (
        <Box>
          <RoutedTabs basePath={BASE} tabs={TABS} ariaLabel="PO review sections" scrollable />
          <Outlet />
        </Box>
      )}
    </AmplifyShell>
  );
}

/** The bare `/amplify/po` lands on the queue. */
export function AmplifyPoIndex() {
  return <Navigate to={`${BASE}/review`} replace />;
}
