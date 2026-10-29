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
import { HttpError } from "@api/http";
import { recordFailureMessage } from "@features/legal/recordErrors";

const httpError = (status: number, message?: string) =>
  new HttpError("/legal-backend/ndas", status, message ? JSON.stringify({ message }) : "");

describe("recordFailureMessage", () => {
  it("suggests trying again only for an outage", () => {
    expect(recordFailureMessage(httpError(503, "Couldn't record the NDA. Try again shortly."))).toMatch(/Please try again\.$/);
    expect(recordFailureMessage(new TypeError("Failed to fetch"))).toMatch(/Please try again\.$/);
  });

  it("says why a refused record was refused, without suggesting a retry", () => {
    const message = recordFailureMessage(httpError(400, "counterpartyName is too long"));
    expect(message).toContain("counterpartyName is too long");
    expect(message).not.toMatch(/try again/i);
    expect(recordFailureMessage(httpError(403, "not allowed to record a Salesforce customer"))).toContain(
      "not allowed to record a Salesforce customer",
    );
  });

  it("still avoids a retry when a refusal has no message", () => {
    expect(recordFailureMessage(httpError(413))).not.toMatch(/try again/i);
  });
});
