// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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
import { HttpError } from "@api/http";
import { IdempotencyKeyLatch, shouldRotateIdempotencyKey } from "./idempotency";

const problem = (status: number, code: string) =>
  new HttpError("https://amplify/x", status, JSON.stringify({ type: "t", title: "t", status, code }));

// The backend stores 2xx and 4xx replies against a key and releases it on a
// 5xx; the same key with another body is 422 IDEMPOTENCY_KEY_REUSED. These pin
// the client side of that contract.
describe("IdempotencyKeyLatch", () => {
  it("reuses the key for a retry of the same request after a timeout or a 5xx", () => {
    const latch = new IdempotencyKeyLatch();
    const first = latch.keyFor({ employeeId: "e1", points: 10, reason: "x" });
    latch.settle(new TypeError("Failed to fetch"));
    expect(latch.keyFor({ employeeId: "e1", points: 10, reason: "x" })).toBe(first);
    latch.settle(problem(503, "DEPENDENCY_UNAVAILABLE"));
    expect(latch.keyFor({ employeeId: "e1", points: 10, reason: "x" })).toBe(first);
  });

  it("mints a new key when the request body changes", () => {
    const latch = new IdempotencyKeyLatch();
    const first = latch.keyFor({ kind: "REPOST" });
    const second = latch.keyFor({ kind: "SHARE_COMMENTARY", commentary: "nice" });
    expect(second).not.toBe(first);
    expect(latch.keyFor({ kind: "SHARE_COMMENTARY", commentary: "nicer" })).not.toBe(second);
  });

  it("mints a new key after a success", () => {
    const latch = new IdempotencyKeyLatch();
    const first = latch.keyFor({ a: 1 });
    latch.settle();
    expect(latch.keyFor({ a: 1 })).not.toBe(first);
  });

  it("mints a new key after a 4xx, which the server stored against the old one", () => {
    const latch = new IdempotencyKeyLatch();
    const first = latch.keyFor({ a: 1 });
    latch.settle(problem(422, "COMMENTARY_REQUIRED"));
    expect(latch.keyFor({ a: 1 })).not.toBe(first);
  });

  it("keeps the key while the first request is still running (409 IDEMPOTENCY_IN_PROGRESS)", () => {
    const latch = new IdempotencyKeyLatch();
    const first = latch.keyFor({ a: 1 });
    latch.settle(problem(409, "IDEMPOTENCY_IN_PROGRESS"));
    expect(latch.keyFor({ a: 1 })).toBe(first);
  });

  it("starts over on reset (a dialog reopened)", () => {
    const latch = new IdempotencyKeyLatch();
    const first = latch.keyFor({ a: 1 });
    latch.reset();
    expect(latch.keyFor({ a: 1 })).not.toBe(first);
  });

  it("produces keys inside the contract's 1-255 characters", () => {
    const key = new IdempotencyKeyLatch().keyFor({});
    expect(key.length).toBeGreaterThan(0);
    expect(key.length).toBeLessThanOrEqual(255);
  });
});

describe("shouldRotateIdempotencyKey", () => {
  it("rotates on success and on any stored 4xx, keeps it otherwise", () => {
    expect(shouldRotateIdempotencyKey(undefined)).toBe(true);
    expect(shouldRotateIdempotencyKey(problem(400, "VALIDATION_FAILED"))).toBe(true);
    expect(shouldRotateIdempotencyKey(problem(422, "IDEMPOTENCY_KEY_REUSED"))).toBe(true);
    expect(shouldRotateIdempotencyKey(problem(409, "DUPLICATE_ACTION"))).toBe(true);
    expect(shouldRotateIdempotencyKey(problem(409, "IDEMPOTENCY_IN_PROGRESS"))).toBe(false);
    expect(shouldRotateIdempotencyKey(problem(500, "INTERNAL_ERROR"))).toBe(false);
    expect(shouldRotateIdempotencyKey(new Error("timeout"))).toBe(false);
  });
});
