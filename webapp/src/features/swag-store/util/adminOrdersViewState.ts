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

import type { UrlViewCodec } from "@hooks/useUrlViewState";
import type { SwagStoreOrderSearch, SwagStoreOrderStatus } from "../api/swagStoreTypes";

/** What the admin orders list shows. */
export interface AdminOrdersView {
  /** One status, or empty for every status. */
  readonly status: SwagStoreOrderStatus | "";
  /** A pickup office id, or empty for every office. */
  readonly office: string;
  /** An order number or an email address. */
  readonly q: string;
  /** 1-based. */
  readonly page: number;
}

export const DEFAULT_ADMIN_ORDERS_VIEW: AdminOrdersView = { status: "", office: "", q: "", page: 1 };

/**
 * The part of the view the address holds, so a filtered list can be linked.
 * The search text is left out: it can be an email address, and the address
 * ends up in browser history and in every link copied from the page.
 */
export type AdminOrdersAddress = Omit<AdminOrdersView, "q">;

/** Orders per page of the admin list. */
export const ADMIN_ORDERS_PAGE_SIZE = 25;

const STATUSES: readonly SwagStoreOrderStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "COLLECTED",
  "FAILED",
];
const OFFICE_ID = /^[0-9A-Za-z-]{1,64}$/;
const PAGE = /^[1-9]\d{0,3}$/;

const isStatus = (value: string | null): value is SwagStoreOrderStatus =>
  STATUSES.includes(value as SwagStoreOrderStatus);

/** The admin orders address codec. Anything it doesn't recognise reads as the default. */
export const adminOrdersCodec: UrlViewCodec<AdminOrdersAddress> = {
  parse(search) {
    const params = new URLSearchParams(search);
    const status = params.get("status");
    const office = params.get("office") ?? "";
    const page = params.get("page") ?? "";
    return {
      status: isStatus(status) ? status : "",
      office: OFFICE_ID.test(office) ? office : "",
      page: PAGE.test(page) ? Number(page) : 1,
    };
  },
  serialize(view) {
    const params = new URLSearchParams();
    if (view.status) params.set("status", view.status);
    if (view.office) params.set("office", view.office);
    if (view.page > 1) params.set("page", String(view.page));
    return params.toString();
  },
};

/** The POST /admin/orders/search body for one page of a view. Search text stays in the body, never in a URL. */
export function orderSearchBody(view: AdminOrdersView): SwagStoreOrderSearch {
  return {
    filters: {
      ...(view.status ? { status: view.status } : {}),
      ...(view.office ? { pickupOfficeId: view.office } : {}),
      ...(view.q ? { searchQuery: view.q } : {}),
    },
    pagination: { limit: ADMIN_ORDERS_PAGE_SIZE, offset: (view.page - 1) * ADMIN_ORDERS_PAGE_SIZE },
  };
}
