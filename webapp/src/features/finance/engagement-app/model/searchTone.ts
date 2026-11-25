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

import type { SearchKind } from "../api/engagementTypes";
import { allocationTone, engagementTone, invoiceTone, travelTone, type ChipTone } from "./statuses";
import type { AllocationStatus, EngagementStatus, InvoiceStatus, TravelStatus } from "../api/engagementTypes";

/** The colour of a hit's status chip, by the same rules as that kind's own list. */
export function chipTone(kind: SearchKind, status: string): ChipTone {
  switch (kind) {
    case "travelRequests":
      return travelTone(status as TravelStatus);
    case "engagements":
      return engagementTone(status as EngagementStatus);
    case "allocations":
      return allocationTone(status as AllocationStatus);
    case "invoices":
    case "perDiemPayments":
      return invoiceTone(status as InvoiceStatus);
  }
}
