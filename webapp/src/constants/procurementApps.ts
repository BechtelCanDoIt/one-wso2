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

// Registry of Procurement, surfaced as a group inside the Finance perspective.
// Phase 1 rows are things any employee does for themself, so none carries
// `requires`: they stay open the way Credit Card's per-user rows do. The rows
// for approving and assigning join the registry with their own gate when those
// screens land.

import { ClipboardListIcon, FilePlusIcon, ShoppingCartIcon } from "@wso2/oxygen-ui-icons-react";
import type { MenuApp } from "@constants/appMenu";
import { procurementPaths } from "@features/finance/procurement/procurementPaths";

export const PROCUREMENT_ITEM = {
  requests: "procurement-requests",
  newRequest: "procurement-new-request",
} as const;

export const PROCUREMENT_APPS: readonly MenuApp[] = [
  {
    key: "procurement",
    name: "Procurement",
    icon: ShoppingCartIcon,
    purpose: "Raise purchase requests and follow them through approval to Procurement.",
    alwaysGroup: true,
    items: [
      {
        id: PROCUREMENT_ITEM.requests,
        label: "My Requests",
        icon: ClipboardListIcon,
        desc: "Purchase requests you have raised, and where each one stands.",
        path: procurementPaths.requests,
      },
      {
        id: PROCUREMENT_ITEM.newRequest,
        label: "New Request",
        icon: FilePlusIcon,
        desc: "Raise a purchase request for IT or Non-IT goods and services.",
        path: procurementPaths.newRequest,
      },
    ],
  },
];
