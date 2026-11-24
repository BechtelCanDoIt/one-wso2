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
import { myAllocationLink } from "./engagementPaths";

describe("myAllocationLink", () => {
  it("opens the engagement under Me when the person may open it", () => {
    expect(myAllocationLink({ engagementId: "E06405", canOpen: true })).toBe("/me/allocations/E06405/allocations");
  });

  it("falls back to the Allocations list otherwise, or when the backend does not say", () => {
    expect(myAllocationLink({ engagementId: "E06405", canOpen: false })).toBe("/me/allocations");
    expect(myAllocationLink({ engagementId: "E06405" })).toBe("/me/allocations");
  });
});
