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
import { beforeEach, describe, expect, it } from "vitest";
import { clearSessionCache, readSessionCache, writeSessionCache } from "./sessionCache";

describe("sessionCache", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("gives back what was saved for the same person", () => {
    writeSessionCache("user-info", "sub-1", { a: 1 }, 1000);
    expect(readSessionCache("user-info", "sub-1", 2000)).toEqual({ a: 1 });
  });

  it("never gives one person's copy to another", () => {
    writeSessionCache("user-info", "sub-1", { a: 1 }, 1000);
    expect(readSessionCache("user-info", "sub-2", 2000)).toBeUndefined();
    expect(readSessionCache("user-info", undefined, 2000)).toBeUndefined();
  });

  it("lets a copy go stale after an hour", () => {
    writeSessionCache("user-info", "sub-1", { a: 1 }, 0);
    expect(readSessionCache("user-info", "sub-1", 59 * 60 * 1000)).toEqual({ a: 1 });
    expect(readSessionCache("user-info", "sub-1", 61 * 60 * 1000)).toBeUndefined();
  });

  it("reads a damaged copy as none", () => {
    sessionStorage.setItem("ea.cache.v1.user-info", "{not json");
    expect(readSessionCache("user-info", "sub-1")).toBeUndefined();
  });

  it("forgets every copy", () => {
    writeSessionCache("user-info", "sub-1", 1);
    writeSessionCache("dashboard-catalogue", "sub-1", 2);
    clearSessionCache();
    expect(readSessionCache("user-info", "sub-1")).toBeUndefined();
    expect(readSessionCache("dashboard-catalogue", "sub-1")).toBeUndefined();
  });
});
