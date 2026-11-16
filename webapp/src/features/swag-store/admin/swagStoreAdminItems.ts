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

/** Where the store's admin screens live, under People Ops. */
export const SWAG_STORE_ADMIN_PATH = "/people-ops/swag-store";

/** Every admin path. The landing at the root sends each person to the first screen they may use. */
export const swagStoreAdminPaths = {
  root: SWAG_STORE_ADMIN_PATH,
  dashboard: `${SWAG_STORE_ADMIN_PATH}/dashboard`,
  orders: `${SWAG_STORE_ADMIN_PATH}/orders`,
  order: (orderNo: string): string =>
    `${SWAG_STORE_ADMIN_PATH}/orders/${encodeURIComponent(orderNo)}`,
  offices: `${SWAG_STORE_ADMIN_PATH}/settings/offices`,
  products: `${SWAG_STORE_ADMIN_PATH}/products`,
  productsTab: (tab: "active" | "draft" | "removed"): string =>
    `${SWAG_STORE_ADMIN_PATH}/products/${tab}`,
  newProduct: `${SWAG_STORE_ADMIN_PATH}/products/new`,
  product: (productId: string): string =>
    `${SWAG_STORE_ADMIN_PATH}/products/${encodeURIComponent(productId)}`,
  demand: `${SWAG_STORE_ADMIN_PATH}/demand`,
  demandProduct: (productId: string): string =>
    `${SWAG_STORE_ADMIN_PATH}/demand/${encodeURIComponent(productId)}`,
} as const;

/** The People Ops rail group that holds the admin screens. */
export const SWAG_STORE_ADMIN_GROUP_ID = "swag-store-admin";

/** Who an admin screen is for. */
export type SwagStoreAdminNeed = "CATALOG_MANAGER" | "FULFILMENT_OPS" | "ANY";

export interface SwagStoreAdminScreen {
  /** The screen's rail row id. */
  readonly id: string;
  /** The rail row's label. */
  readonly label: string;
  /** Where the rail row and the landing send people. */
  readonly path: string;
  readonly need: SwagStoreAdminNeed;
}

/**
 * Every admin screen, in rail order: the one place that says who each screen
 * is for. The rail rows, the rail gate, the landing and the routes' role
 * checks all read it. Each phase adds the rows of the screens it ships.
 */
export const SWAG_STORE_ADMIN_SCREENS = {
  dashboard: {
    id: "swag-store-admin-dashboard",
    label: "Dashboard",
    path: swagStoreAdminPaths.dashboard,
    need: "ANY",
  },
  orders: {
    id: "swag-store-admin-orders",
    label: "Orders",
    path: swagStoreAdminPaths.orders,
    need: "FULFILMENT_OPS",
  },
  products: {
    id: "swag-store-admin-products",
    label: "Products",
    path: swagStoreAdminPaths.products,
    need: "CATALOG_MANAGER",
  },
  demand: {
    id: "swag-store-admin-demand",
    label: "Demand",
    path: swagStoreAdminPaths.demand,
    need: "CATALOG_MANAGER",
  },
  settings: {
    id: "swag-store-admin-settings",
    label: "Settings",
    path: swagStoreAdminPaths.offices,
    need: "FULFILMENT_OPS",
  },
} as const satisfies Record<string, SwagStoreAdminScreen>;

export type SwagStoreAdminScreenKey = keyof typeof SWAG_STORE_ADMIN_SCREENS;

/** Every id the Swag Store admin gate answers for in the rail, the group included. */
export const SWAG_STORE_ADMIN_ITEM_IDS: ReadonlySet<string> = new Set([
  SWAG_STORE_ADMIN_GROUP_ID,
  ...Object.values(SWAG_STORE_ADMIN_SCREENS).map((s) => s.id),
]);
