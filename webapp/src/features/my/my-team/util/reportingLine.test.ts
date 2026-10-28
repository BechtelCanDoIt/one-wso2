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
import { isAdditionalReport } from "./reportingLine";

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
