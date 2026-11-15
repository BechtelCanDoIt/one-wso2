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

import { StatusChip } from "@features/finance/components/FinanceChips";
import type { RequestStatus } from "../types";

const STATUS: Record<RequestStatus, { label: string; color: "warning" | "success" | "error" | "info" | "default" }> = {
  draft: { label: "Draft", color: "default" },
  cancelled: { label: "Cancelled", color: "default" },
  submitted: { label: "Pending approval", color: "warning" },
  approved: { label: "Approved", color: "info" },
  rejected: { label: "Rejected", color: "error" },
  assigned: { label: "Assigned", color: "success" },
};

export function RequestStatusChip({ status }: { status: RequestStatus }) {
  const { label, color } = STATUS[status];
  return <StatusChip label={label} color={color} />;
}
