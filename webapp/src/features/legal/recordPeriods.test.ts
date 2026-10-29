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
import { periodLabel, periodOptions } from "@features/legal/recordPeriods";

describe("periodOptions", () => {
  it("offers the usual periods up to the maximum, with the default and maximum", () => {
    expect(periodOptions(7, 30)).toEqual([1, 3, 7, 30]);
    expect(periodOptions(7, 14)).toEqual([1, 3, 7, 14]);
    expect(periodOptions(10, 90)).toEqual([1, 3, 7, 10, 30, 90]);
  });

  it("offers only the default when nothing more is allowed or known", () => {
    expect(periodOptions(7, 7)).toEqual([1, 3, 7]);
    expect(periodOptions(7, null)).toEqual([7]);
    expect(periodOptions(null, null)).toEqual([]);
  });
});

describe("periodLabel", () => {
  it("names the period", () => {
    expect(periodLabel(1)).toBe("Last day");
    expect(periodLabel(30)).toBe("Last 30 days");
  });
});
