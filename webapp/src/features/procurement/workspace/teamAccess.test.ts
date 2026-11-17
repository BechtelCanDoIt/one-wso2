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
import { hasTeamRole, procurementTeamVisibility } from "./teamAccess";

describe("the Procurement team's access", () => {
  it("is for Procurement users and admins only", () => {
    expect(hasTeamRole(["procurement_user"])).toBe(true);
    expect(hasTeamRole(["procurement_admin"])).toBe(true);
    expect(hasTeamRole([])).toBe(false);
    expect(hasTeamRole(["someone_else"])).toBe(false);
  });

  it("shows the rail row only to the team, and carries a failure to the rail", () => {
    const retry = () => undefined;
    expect(procurementTeamVisibility({ canSee: true, isResolving: false, error: undefined, retry }).canSee("any")).toBe(true);
    expect(procurementTeamVisibility({ canSee: false, isResolving: true, error: undefined, retry }).resolving).toBe(true);
    expect(procurementTeamVisibility({ canSee: false, isResolving: false, error: "Could not read your roles.", retry }).error).toBe("Could not read your roles.");
  });
});
