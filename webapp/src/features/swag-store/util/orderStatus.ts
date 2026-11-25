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

import type { SwagStoreOrderStatus } from "../api/swagStoreTypes";

const LABEL: Readonly<Record<SwagStoreOrderStatus, string>> = {
  PENDING_PAYMENT: "Payment pending",
  CONFIRMED: "Confirmed",
  READY_FOR_PICKUP: "Ready for pickup",
  COLLECTED: "Collected",
  FAILED: "Failed",
};

/** What every order screen calls a status: its chip and an order's history. A status it doesn't know shows as sent. */
export function orderStatusLabel(status: string): string {
  return LABEL[status as SwagStoreOrderStatus] ?? status;
}
