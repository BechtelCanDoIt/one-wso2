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

const BASE = "/amplify/admin";

const TABS: readonly RoutedTabDef[] = [
  { segment: "settings", label: "Settings" },
  { segment: "announcements", label: "Announcements" },
  { segment: "point-rules", label: "Point rules" },
];

/**
 * Admin's frame. Three concerns that used to be three rail rows collapse into
 * one screen with tabs, so the rail stays a list of places rather than a list
 * of settings.
 */
export default function AmplifyAdminPage() {
  return (
    <AmplifyShell
      title="Admin"
      subtitle="Module-wide settings, the announcement queue, and the point rules."
      requireRole="admin"
    >
      {() => (
        <Box>
          <RoutedTabs basePath={BASE} tabs={TABS} ariaLabel="Amplify admin sections" scrollable />
          <Outlet />
        </Box>
      )}
    </AmplifyShell>
  );
}

export function AmplifyAdminIndex() {
  return <Navigate to={`${BASE}/settings`} replace />;
}
