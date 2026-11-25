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

import { HttpError } from "@api/http";
import type { JobCostSummary } from "../api/dashboardTypes";

/** What the card shows: still loading, hidden, a quiet failure, or the figures. */
export type TotalCostState =
  | { readonly kind: "loading" }
  | { readonly kind: "hidden" }
  | { readonly kind: "error" }
  | { readonly kind: "ready"; readonly data: JobCostSummary };

/** A 403 or 404 means the viewer may not see the cost, so the card is left out. Any other failure is a quiet message. */
export function totalCostState(q: { isPending: boolean; isError: boolean; error: unknown; data: JobCostSummary | undefined }): TotalCostState {
  if (q.isError) return q.error instanceof HttpError && (q.error.status === 403 || q.error.status === 404) ? { kind: "hidden" } : { kind: "error" };
  if (q.isPending || !q.data) return { kind: "loading" };
  return { kind: "ready", data: q.data };
}
