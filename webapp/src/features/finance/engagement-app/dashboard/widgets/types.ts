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

import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { EngagementQueryParams } from "@config/apiConfig";
import type { AllocationsToday, Dashboard } from "../../api/engagementTypes";
import type { TravelCosts } from "../../api/dashboardTypes";
import type { CostView, CostViewPatch, FilterKey } from "../travelCosts/costView";

/** The dashboard sections `GET /dashboard?sections=` takes. */
export type DashboardSectionKey =
  | "waitingOnYou"
  | "travel"
  | "travelTeam"
  | "engagementManager"
  | "accountManager"
  | "marketingEvents"
  | "engagements"
  | "availableConsultants"
  | "allocationsOverTime";

export type WidgetGroup = "core" | "travelCosts" | "travel" | "engagements" | "events" | "allocations";

/** What a Travel Costs widget's Export CSV asks the backend for. */
export type CostCsvSection = "kpis" | "bySource" | "byMonth" | "byCountry" | "byCustomer" | "byTravelAgent" | "byCostType" | "byPaid" | "transactions";

export type SectionState =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly error?: unknown }
  | { readonly status: "loaded" };

export type WidgetState =
  | { readonly kind: "loading" }
  /** The section loaded but the backend left this widget's part out: the widget is not drawn at all. */
  | { readonly kind: "absent" }
  | { readonly kind: "failed"; readonly error?: unknown }
  | { readonly kind: "empty" }
  | { readonly kind: "ready" };

/** Travel Costs: the controls bar's view and the one summary query every cost widget reads. */
export interface CostCtx {
  readonly view: CostView;
  readonly set: (patch: CostViewPatch) => void;
  readonly drill: (key: FilterKey, value: string) => void;
  /** The filter and range parameters of this view. */
  readonly params: EngagementQueryParams;
  readonly query: UseQueryResult<TravelCosts, Error>;
  readonly exportCsv: (section: CostCsvSection | "summary") => Promise<void>;
}

export interface AllocationsTodayCtx {
  readonly businessUnit: string;
  readonly date: string;
  readonly query: UseQueryResult<AllocationsToday, Error>;
  readonly change: (next: { businessUnit?: string; date?: string }) => void;
}

/** Everything a widget may need, built once by the dashboard page. */
export interface WidgetCtx {
  readonly today: string;
  /** The backend's business date (UTC), the one "today" of Allocations Today and the page header; the browser's own date until the dashboard has loaded. */
  readonly businessDate: string;
  /** The default sections and any a person turned on, merged. */
  readonly dashboard?: Dashboard;
  readonly section: (key: DashboardSectionKey) => SectionState;
  /** Retries the query that owns `section` (the base call, or the extra-sections call); with no section, every query. */
  readonly retry: (section?: DashboardSectionKey) => void;
  readonly retrying: boolean;
  readonly allocationsToday: AllocationsTodayCtx;
  readonly cost: CostCtx;
}

export interface WidgetDef {
  readonly id: string;
  /** In Manage Widgets, and the frame's heading unless `heading` says otherwise. */
  readonly title: string;
  readonly heading?: (ctx: WidgetCtx) => string;
  readonly note?: string | ((ctx: WidgetCtx) => string | undefined);
  readonly size: "full" | "half";
  /** The `GET /dashboard` section it reads. */
  readonly section?: DashboardSectionKey;
  readonly group: WidgetGroup;
  readonly slow?: boolean;
  readonly csv?: CostCsvSection;
  /** Where its data and loading state come from. `own` widgets run their own queries and states. */
  readonly source: "dashboard" | "cost" | "own";
  readonly empty: string;
  readonly isEmpty?: (ctx: WidgetCtx) => boolean;
  /** False when the loaded section lacks this widget's part (the backend sends a part only when the caller may see the widget). */
  readonly present?: (ctx: WidgetCtx) => boolean;
  readonly Component: (props: { readonly ctx: WidgetCtx }) => ReactNode;
}
