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

// Every MIS read is an idempotent POST, and a screen fans out to several in
// parallel. The shared `httpRetry` retries once with React Query's default
// one-second delay, and never retries a 4xx — which includes 408 and 429, the
// two 4xx that mean "ask again". A burst that trips the gateway then fails
// every retry too, and the failed figure stays cached for the staleTime.

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 4000;
const RETRYABLE_CLIENT_STATUSES = new Set([408, 429]);

export function misReadRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (error instanceof HttpError) {
    return error.status >= 500 || RETRYABLE_CLIENT_STATUSES.has(error.status);
  }
  // `fetch` throws TypeError when the request never gets a response. A parser
  // Error is a payload this client cannot read; asking again will not change it.
  return error instanceof TypeError;
}

export function misReadRetryDelay(failureCount: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** failureCount, MAX_DELAY_MS);
}
