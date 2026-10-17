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

// Every Amplify route, as one fragment for App.tsx — the feature owns its tree,
// as CadO2 and the GRC modules own theirs.
//
// Access is NOT enforced here: AmplifyShell walks the gate ladder in front of
// every screen, so typing an Admin address you may not use gives a legible
// refusal rather than a redirect that leaves the reader guessing. App.tsx wraps
// this whole fragment in `isPreviewEnabled("amplify")`, so the routes simply do
// not exist when the flag is off — hiding the rail alone would leave them
// reachable by URL.

import { Route } from "react-router";
import PerspectiveLanding from "@components/perspective-landing/PerspectiveLanding";
import AmplifyPostsPage from "./pages/AmplifyPostsPage";
import AmplifyLeaderboardPage from "./pages/AmplifyLeaderboardPage";
import AmplifyMyCampaignPage from "./pages/AmplifyMyCampaignPage";
import AmplifyTeamPage from "./pages/AmplifyTeamPage";
import AmplifyCampaignsPage from "./pages/AmplifyCampaignsPage";
import AmplifyPoPage, { AmplifyPoIndex } from "./pages/AmplifyPoPage";
import AmplifyPoReviewTab from "./pages/AmplifyPoReviewTab";
import AmplifyPoDashboardTab from "./pages/AmplifyPoDashboardTab";
import AmplifyPoPointRulesTab from "./pages/AmplifyPoPointRulesTab";
import AmplifyAdminPage, { AmplifyAdminIndex } from "./pages/AmplifyAdminPage";
import AmplifyAdminSettingsTab from "./pages/AmplifyAdminSettingsTab";
import AmplifyAdminAnnouncementsTab from "./pages/AmplifyAdminAnnouncementsTab";
import AmplifyReportsPage from "./pages/AmplifyReportsPage";
import AmplifyConnectionsPage from "./pages/AmplifyConnectionsPage";
import AmplifyConnectCallbackPage from "./pages/AmplifyConnectCallbackPage";

export const amplifyRoutes = (
  <>
    {/* The perspective's own address forwards to the first item the caller can
        use (Posts for most people) — Amplify has no overview worth stopping on. */}
    <Route path="amplify" element={<PerspectiveLanding />} />
    <Route path="amplify/posts" element={<AmplifyPostsPage />} />
    <Route path="amplify/leaderboard" element={<AmplifyLeaderboardPage />} />
    <Route path="amplify/my-campaign" element={<AmplifyMyCampaignPage />} />
    <Route path="amplify/team" element={<AmplifyTeamPage />} />
    <Route path="amplify/campaigns" element={<AmplifyCampaignsPage />} />

    <Route path="amplify/po" element={<AmplifyPoPage />}>
      <Route index element={<AmplifyPoIndex />} />
      <Route path="review" element={<AmplifyPoReviewTab />} />
      <Route path="dashboard" element={<AmplifyPoDashboardTab />} />
      <Route path="point-rules" element={<AmplifyPoPointRulesTab />} />
    </Route>

    <Route path="amplify/admin" element={<AmplifyAdminPage />}>
      <Route index element={<AmplifyAdminIndex />} />
      <Route path="settings" element={<AmplifyAdminSettingsTab />} />
      <Route path="announcements" element={<AmplifyAdminAnnouncementsTab />} />
    </Route>

    {/* Phase 2. Hidden from the rail (its registry item carries no path); the
        route exists so the address answers honestly rather than 404s. */}
    <Route path="amplify/reports" element={<AmplifyReportsPage />} />

    {/* Where LinkedIn returns the reader after consent. The redirect URI is a
        deployment configurable (`linkedinRedirectUri`), so both the path the
        milestone names and the one the Connections screen uses are served. */}
    <Route path="amplify/connect/callback" element={<AmplifyConnectCallbackPage />} />
    <Route path="amplify/connections/callback" element={<AmplifyConnectCallbackPage />} />

    {/* Me → Settings → My Connections. Rendered under the Me perspective (the
        path prefix is /settings, which Me's rail already covers). */}
    <Route path="settings/connections" element={<AmplifyConnectionsPage />} />
  </>
);
