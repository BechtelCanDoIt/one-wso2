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
import { EMPTY_CONTROL_FILTERS } from "@features/security/grc/modules/audit/utils/controlFilters";
import { buildControlExportQuery } from "@features/security/grc/modules/audit/utils/controlExportQuery";

describe("buildControlExportQuery", () => {
  it("is empty for the unfiltered All view", () => {
    expect(buildControlExportQuery(null, EMPTY_CONTROL_FILTERS, "").toString()).toBe("");
  });

  it("sends only the tab when a tab is active, as the page ignores the rest then", () => {
    const filters = { ...EMPTY_CONTROL_FILTERS, status: ["COMPLETE"] };
    expect(buildControlExportQuery("overdue", filters, "backups").toString()).toBe("tab=overdue");
  });

  it("sends the trimmed search", () => {
    expect(buildControlExportQuery(null, EMPTY_CONTROL_FILTERS, "  access  ").get("search")).toBe("access");
  });

  it("leaves out a blank search", () => {
    expect(buildControlExportQuery(null, EMPTY_CONTROL_FILTERS, "   ").has("search")).toBe(false);
  });

  it("maps each column filter to its param, repeating it for several values", () => {
    const q = buildControlExportQuery(
      null,
      {
        status: ["COMPLETE", "OVERDUE"],
        requirementType: ["OE"],
        controlType: ["CONFIG"],
        scope: ["COMMON"],
        teamName: ["Platform"],
        auditorName: ["Ada Auditor"],
        ownerName: ["Owen Owner"],
      },
      "",
    );
    expect(q.getAll("status")).toEqual(["COMPLETE", "OVERDUE"]);
    expect(q.getAll("requirement_type")).toEqual(["OE"]);
    expect(q.getAll("control_type")).toEqual(["CONFIG"]);
    expect(q.getAll("scope")).toEqual(["COMMON"]);
    expect(q.getAll("team")).toEqual(["Platform"]);
    expect(q.getAll("auditor")).toEqual(["Ada Auditor"]);
    expect(q.getAll("owner")).toEqual(["Owen Owner"]);
  });

  it("keeps a name containing a comma as one value", () => {
    const q = buildControlExportQuery(null, { ...EMPTY_CONTROL_FILTERS, teamName: ["Platform, Core"] }, "");
    expect(q.getAll("team")).toEqual(["Platform, Core"]);
  });

  it("sends a filter on the empty name, which means 'no team'", () => {
    const q = buildControlExportQuery(null, { ...EMPTY_CONTROL_FILTERS, teamName: [""] }, "");
    expect(q.getAll("team")).toEqual([""]);
  });
});
