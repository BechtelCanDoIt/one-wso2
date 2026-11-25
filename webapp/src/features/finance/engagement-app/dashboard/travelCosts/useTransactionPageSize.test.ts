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

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useTransactionPageSize } from "./useTransactionPageSize";

const KEY = "engagement-app.transactions.pageSize";

describe("useTransactionPageSize", () => {
  afterEach(() => localStorage.clear());

  it("starts at 25 when nothing is stored", () => {
    expect(renderHook(() => useTransactionPageSize()).result.current[0]).toBe(25);
  });

  it("reads a stored choice and ignores one it doesn't offer", () => {
    localStorage.setItem(KEY, "10");
    expect(renderHook(() => useTransactionPageSize()).result.current[0]).toBe(10);
    localStorage.setItem(KEY, "7");
    expect(renderHook(() => useTransactionPageSize()).result.current[0]).toBe(25);
  });

  it("keeps a new choice in the browser", () => {
    const { result } = renderHook(() => useTransactionPageSize());
    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
    expect(localStorage.getItem(KEY)).toBe("5");
  });
});
