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

// The Amplify module's rail registry: ONE parent ("Amplify") whose sub-menus
// are the module's screens. Same App → items model as MARKETING_OPS_APPS and
// CADO2_APPS, and for the same reason: the left rail (via appsToSections in
// @constants/perspectives), the waffle and the landing all derive from this one
// array, so they cannot drift apart.
//
// ---- ONE parent, no "Home" -------------------------------------------------
//
// Per the 2026-10-15 rail review, Amplify is a single group with sub-menus, so
// the left panel never changes shape as you move between screens, and clicking
// the parent opens the group and lands on Posts. There is deliberately no "Home"
// item: a landing row that only bounces you to another row is not a destination.
//
// ---- `requires` is NOT used here ------------------------------------------
//
// Every item is claimed by the `amplify` visibility adapter and decided by the
// Amplify backend's OWN `GET /me` roles (amplify_po / amplify_marketing /
// amplify_slt / amplify_admin), which bear no relation to people-app's
// capability numbers (`requires` speaks employee/lead/serviceDesk/admin). So no
// item declares `requires`; the adapter answers for every one of them, and the
// backend is the real gate regardless. See useAmplifyGate.
//
// ---- order ----------------------------------------------------------------
//
// THIS ARRAY'S ORDER IS THE RAIL ORDER. Posts is first because it is the
// default destination and the thing everyone does. Reports sits after PO Review
// and before Admin (it is hidden anyway until Phase 2). Don't sort it.

import { MegaphoneIcon } from "@wso2/oxygen-ui-icons-react";
import type { MenuApp } from "@constants/appMenu";

export const AMPLIFY_APPS: readonly MenuApp[] = [
  {
    key: "amplify",
    name: "Amplify",
    icon: MegaphoneIcon,
    // One group, always: collapsing to a single visible child would make the
    // whole module read as a leaf and lose the module's shape in the rail.
    alwaysGroup: true,
    purpose:
      "Share WSO2 campaigns onto your social channels, earn points for amplification, and see where you and your team stand.",
    items: [
      {
        id: "amplify-posts",
        label: "Posts",
        desc: "Open campaigns to share, filtered by tag. Everyone sees every open campaign.",
        path: "/amplify/posts",
      },
      {
        id: "amplify-leaderboard",
        label: "Leaderboard",
        desc: "The company top table, your own standing, and your team.",
        path: "/amplify/leaderboard",
      },
      {
        id: "amplify-my-campaign",
        label: "My Campaign",
        desc: "Propose a campaign of your own, and track the one you already submitted.",
        path: "/amplify/my-campaign",
      },
      {
        id: "amplify-team",
        label: "Team",
        desc: "Everyone in the company with their points — and, for a reviewer, adjustments.",
        path: "/amplify/team",
      },
      {
        id: "amplify-campaigns",
        label: "Campaigns",
        desc: "Create, edit and archive the campaigns the company shares.",
        path: "/amplify/campaigns",
      },
      {
        id: "amplify-po-review",
        label: "PO Review",
        desc: "Review external-share evidence, manage point rules, and read the Amplify dashboard.",
        path: "/amplify/po",
      },
      // Phase 2 placeholder — hidden from the rail until it is built. The route
      // exists and says so, but the item carries no path so the row never shows.
      {
        id: "amplify-reports",
        label: "Reports",
        desc: "Amplify reporting for the SLT. Phase 2.",
      },
      {
        id: "amplify-admin",
        label: "Admin",
        desc: "Top-N size, run interval, reminder days, campaign defaults, and failed announcements.",
        path: "/amplify/admin",
      },
    ],
  },
];

/**
 * Every Amplify rail id, the group included.
 *
 * The group id is here as well as its children, the way UMT_ITEM_IDS carries
 * its group: an id no adapter claims falls through to the people-app capability
 * check, and this group sets no `requires` — so without this the row would show
 * to everyone regardless of what Amplify's /me says.
 */
export const AMPLIFY_ITEM_IDS: ReadonlySet<string> = new Set([
  `sec-app-${AMPLIFY_APPS[0].key}`,
  ...AMPLIFY_APPS.flatMap((app) => app.items.map((item) => item.id)),
]);

function eyebrowFor(key: string): { icon: MenuApp["icon"]; label: string } {
  const app = AMPLIFY_APPS.find((a) => a.key === key)!;
  return { icon: app.icon, label: app.name };
}

/** Eyebrow descriptors for AmplifyShell, derived from the registry above. */
export const AMPLIFY_EYEBROW = {
  amplify: eyebrowFor("amplify"),
} as const;

export const AMPLIFY_PATHS = {
  posts: "/amplify/posts",
  leaderboard: "/amplify/leaderboard",
  myCampaign: "/amplify/my-campaign",
  team: "/amplify/team",
  campaigns: "/amplify/campaigns",
  poReview: "/amplify/po",
  reports: "/amplify/reports",
  admin: "/amplify/admin",
  connections: "/settings/connections",
  /** Where LinkedIn sends the browser back after consent — its own tab. */
  connectCallback: "/amplify/connections/callback",
} as const;
