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
import type { Visa } from "../api/engagementTypes";
import { visaStatus } from "./documentColumns";

const visa = (status: Visa["status"], end: string) => ({ status, end }) as Visa;

describe("visaStatus", () => {
  it("follows the end date for an Active visa", () => {
    expect(visaStatus(visa("Active", "2026-11-16"), "2026-11-16")).toBe("Active");
    expect(visaStatus(visa("Active", "2026-11-15"), "2026-11-16")).toBe("Expired");
  });

  it("keeps a stored Inactive or Expired status whatever the end date", () => {
    expect(visaStatus(visa("Inactive", "2027-01-01"), "2026-11-16")).toBe("Inactive");
    expect(visaStatus(visa("Expired", "2026-11-16"), "2026-11-16")).toBe("Expired");
  });
});
