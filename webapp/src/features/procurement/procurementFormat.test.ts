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


import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatCalendarDate } from "./procurementFormat";

describe("formatCalendarDate", () => {
  const original = process.env.TZ;
  beforeEach(() => {
    process.env.TZ = "America/Los_Angeles";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  it("shows the day that was written, even west of UTC", () => {
    expect(formatCalendarDate("2027-03-01")).toContain("1");
    expect(formatCalendarDate("2027-03-01")).toContain("Mar");
    expect(formatCalendarDate("2027-03-01")).not.toContain("Feb");
  });
});
