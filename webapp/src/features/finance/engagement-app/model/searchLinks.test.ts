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
import { jobQuery } from "./searchLinks";

describe("jobQuery", () => {
  it("writes a whole job number the way the lists store it", () => {
    expect(jobQuery("2026110003")).toBe("TRV-2026-11-0003");
    expect(jobQuery("TRV2026110003")).toBe("TRV-2026-11-0003");
    expect(jobQuery("trv 2026 11 0003")).toBe("TRV-2026-11-0003");
  });

  it("upper-cases a typed prefix and leaves anything else alone", () => {
    expect(jobQuery("trv-2026-11")).toBe("TRV-2026-11");
    expect(jobQuery(" 2026-11 ")).toBe("2026-11");
    expect(jobQuery("INV-0001")).toBe("INV-0001");
  });
});
