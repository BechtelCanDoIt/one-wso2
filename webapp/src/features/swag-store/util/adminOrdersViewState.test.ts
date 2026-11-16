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

import { describe, expect, it } from "vitest";
import { adminOrdersCodec, ADMIN_ORDERS_PAGE_SIZE, DEFAULT_ADMIN_ORDERS_VIEW, orderSearchBody } from "./adminOrdersViewState";

describe("adminOrdersCodec", () => {
  const everyOrder = { status: "", office: "", page: 1 };

  it("reads an empty address as every order, first page", () => {
    expect(adminOrdersCodec.parse("")).toStrictEqual(everyOrder);
  });

  it("reads status, office and page, never search text, and drops what it doesn't know", () => {
    expect(adminOrdersCodec.parse("status=READY_FOR_PICKUP&office=office-1&q=SS-10482&page=3")).toStrictEqual({
      status: "READY_FOR_PICKUP",
      office: "office-1",
      page: 3,
    });
    expect(adminOrdersCodec.parse("status=LOST&page=0")).toStrictEqual(everyOrder);
  });

  it("writes only what differs from the default, never the search text, and round-trips", () => {
    const view = { ...DEFAULT_ADMIN_ORDERS_VIEW, status: "CONFIRMED" as const, q: "sam@wso2.com" };
    expect(adminOrdersCodec.serialize(view)).toBe("status=CONFIRMED");
    expect(adminOrdersCodec.parse(adminOrdersCodec.serialize(view))).toStrictEqual({ ...everyOrder, status: "CONFIRMED" });
    expect(adminOrdersCodec.serialize(DEFAULT_ADMIN_ORDERS_VIEW)).toBe("");
  });
});

describe("orderSearchBody", () => {
  it("sends only the filters that are set, and one page", () => {
    expect(orderSearchBody({ status: "CONFIRMED", office: "office-1", q: "sam", page: 2 })).toEqual({
      filters: { status: "CONFIRMED", pickupOfficeId: "office-1", searchQuery: "sam" },
      pagination: { limit: ADMIN_ORDERS_PAGE_SIZE, offset: ADMIN_ORDERS_PAGE_SIZE },
    });
    expect(orderSearchBody(DEFAULT_ADMIN_ORDERS_VIEW)).toEqual({
      filters: {},
      pagination: { limit: ADMIN_ORDERS_PAGE_SIZE, offset: 0 },
    });
  });
});
