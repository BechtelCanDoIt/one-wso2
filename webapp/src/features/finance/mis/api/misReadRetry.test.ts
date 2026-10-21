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
import { HttpError } from "@api/http";
import { misReadRetry, misReadRetryDelay } from "./misReadRetry";

const failure = (status: number) => new HttpError("https://mis.example", status, "");

describe("retrying a MIS read", () => {
  it.each([408, 429, 500, 502, 503, 504])("retries a transient %i, twice", (status) => {
    expect(misReadRetry(0, failure(status))).toBe(true);
    expect(misReadRetry(1, failure(status))).toBe(true);
    expect(misReadRetry(2, failure(status))).toBe(false);
  });

  it.each([400, 401, 403, 404])("does not retry a %i, which a second ask will not change", (status) => {
    expect(misReadRetry(0, failure(status))).toBe(false);
  });

  it("retries a request that never got an answer", () => {
    expect(misReadRetry(0, new TypeError("Failed to fetch"))).toBe(true);
  });

  it("does not retry a payload the parser rejected", () => {
    expect(misReadRetry(0, new Error("not an account"))).toBe(false);
  });

  it("waits longer before each further attempt, up to a ceiling", () => {
    expect(misReadRetryDelay(0)).toBe(500);
    expect(misReadRetryDelay(1)).toBe(1000);
    expect(misReadRetryDelay(10)).toBe(4000);
  });
});
