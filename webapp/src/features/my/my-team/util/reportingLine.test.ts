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
import { cameThrough, isAdditionalReport, viaLabel } from "./reportingLine";

const VIEWER = "lead@wso2.com";

const member = (managerEmail: string, additionalManagerEmails: string | null) => ({
  managerEmail,
  additionalManagerEmails,
});

describe("isAdditionalReport", () => {
  it("is true when the viewer is one of the additional managers", () => {
    expect(isAdditionalReport(member("other@wso2.com", "a@wso2.com,lead@wso2.com"), VIEWER)).toBe(true);
  });

  it("ignores case and stray spaces", () => {
    expect(isAdditionalReport(member("other@wso2.com", "a@wso2.com, Lead@WSO2.com "), VIEWER)).toBe(true);
  });

  // Reporting directly to the viewer is the stronger link, and the one the
  // "Direct Reports" toggle is about, so it is not marked as additional.
  it("is false when the viewer is also the manager", () => {
    expect(isAdditionalReport(member("LEAD@wso2.com", "lead@wso2.com"), VIEWER)).toBe(false);
  });

  it("is false for a direct report", () => {
    expect(isAdditionalReport(member("lead@wso2.com", null), VIEWER)).toBe(false);
  });

  // Someone further down the chain whose additional manager is one of the
  // viewer's reports, not the viewer.
  it("is false when someone else is the additional manager", () => {
    expect(isAdditionalReport(member("other@wso2.com", "a@wso2.com"), VIEWER)).toBe(false);
  });

  // The backend sends '' rather than null when there are none.
  it("is false when there are no additional managers", () => {
    expect(isAdditionalReport(member("other@wso2.com", ""), VIEWER)).toBe(false);
    expect(isAdditionalReport(member("other@wso2.com", null), VIEWER)).toBe(false);
  });

  it("matches whole addresses only", () => {
    expect(isAdditionalReport(member("other@wso2.com", "slead@wso2.com,lead@wso2.com.au"), VIEWER)).toBe(false);
  });

  // An empty entry in the list must not match an unknown viewer.
  it("is false when the viewer's email is unknown", () => {
    for (const unknown of [undefined, null, "", "  "]) {
      expect(isAdditionalReport(member("other@wso2.com", "a@wso2.com,,"), unknown)).toBe(false);
    }
  });
});

const row = (over: Partial<Parameters<typeof cameThrough>[0]> = {}) => ({
  managerEmail: "other@wso2.com",
  additionalManagerEmails: "",
  throughEmployeeId: "LK100002",
  throughFirstName: "Chamara Thilina",
  throughLastName: "Samarakoon",
  ...over,
});

describe("cameThrough", () => {
  it("names the viewer's additional report the member came through", () => {
    expect(cameThrough(row(), VIEWER)).toEqual({
      employeeId: "LK100002",
      firstName: "Chamara Thilina",
      lastName: "Samarakoon",
    });
  });

  // An older backend sends no such fields; Direct Reports Only sends nulls.
  it("is null when the server names no one", () => {
    expect(cameThrough(row({ throughEmployeeId: null }), VIEWER)).toBeNull();
    expect(cameThrough(row({ throughEmployeeId: undefined }), VIEWER)).toBeNull();
  });

  // Being their additional manager is the closer link, and has its own chip.
  it("is null when the viewer is their additional manager", () => {
    expect(cameThrough(row({ additionalManagerEmails: VIEWER }), VIEWER)).toBeNull();
  });
});

describe("viaLabel", () => {
  it("uses the first word of the first name", () => {
    expect(viaLabel({ firstName: "Chamara Thilina", lastName: "Samarakoon" })).toBe("Via Chamara");
  });

  it("falls back to the last name", () => {
    expect(viaLabel({ firstName: " ", lastName: "Samarakoon" })).toBe("Via Samarakoon");
  });
});
