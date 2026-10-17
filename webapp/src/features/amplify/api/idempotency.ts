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

// The Idempotency-Key lifecycle for every Amplify mutation that can be retried.
//
// The backend (`amplify-api/idempotency.bal`) fingerprints a keyed POST as
// `method + route + body`, and then:
//
//   * same key, same body, first call finished  → replays the stored reply
//     (2xx AND 4xx are stored; a 5xx releases the key);
//   * same key, DIFFERENT body                  → 422 IDEMPOTENCY_KEY_REUSED;
//   * same key while the first is still running → 409 IDEMPOTENCY_IN_PROGRESS.
//
// So the key has to be a function of (this attempt-series, this exact request):
//
//   * a retry of the SAME request after a timeout or a 5xx must reuse the key,
//     or a request the server already applied is applied twice (a second
//     ledger row, a second share);
//   * a CHANGED request must get a new key, or it is refused as a reuse;
//   * after a success, or a 4xx (stored against the key — replaying it would
//     only hand back the same refusal), the next attempt gets a new key;
//   * after IDEMPOTENCY_IN_PROGRESS the first call may still land, so the key
//     is kept — minting a new one there is exactly the double-apply.
//
// `IdempotencyKeyLatch` is the plain state machine (testable without React);
// `useIdempotencyKey` holds one per component instance.

import { useState } from "react";
import { HttpError } from "@api/http";
import { amplifyProblemCode, newIdempotencyKey } from "./amplifyClient";

const IN_PROGRESS = "IDEMPOTENCY_IN_PROGRESS";

/**
 * Whether the outcome of a keyed call means the NEXT attempt needs a fresh key.
 * `undefined` is a success. Network failures, timeouts and 5xx keep the key so
 * the retry can be deduplicated server-side.
 */
export function shouldRotateIdempotencyKey(outcome?: unknown): boolean {
  if (outcome === undefined) return true;
  if (!(outcome instanceof HttpError)) return false;
  if (outcome.status >= 500) return false;
  return amplifyProblemCode(outcome) !== IN_PROGRESS;
}

export class IdempotencyKeyLatch {
  private fingerprint: string | null = null;
  private key: string | null = null;

  /**
   * The key for this request. The same request (by value) gets the same key
   * until the latch is settled or reset; a different request gets a new one.
   */
  keyFor(request: unknown): string {
    const fingerprint = JSON.stringify(request ?? null);
    if (this.key === null || fingerprint !== this.fingerprint) {
      this.fingerprint = fingerprint;
      this.key = newIdempotencyKey();
    }
    return this.key;
  }

  /** Record a call's outcome (`undefined` = success); rotates when it must. */
  settle(outcome?: unknown): void {
    if (shouldRotateIdempotencyKey(outcome)) this.reset();
  }

  /** Forget the key — e.g. when a dialog is (re)opened for a new attempt. */
  reset(): void {
    this.fingerprint = null;
    this.key = null;
  }
}

/** One latch per component instance, stable across renders. */
export function useIdempotencyKey(): IdempotencyKeyLatch {
  const [latch] = useState(() => new IdempotencyKeyLatch());
  return latch;
}
