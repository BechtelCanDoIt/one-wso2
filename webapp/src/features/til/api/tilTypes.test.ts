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
import { isTilWhere, normalizeSubmission, TIL_WHERE_OPTIONS } from "./tilTypes";

describe("isTilWhere", () => {
  it.each(TIL_WHERE_OPTIONS)("accepts %s", (opt) => {
    expect(isTilWhere(opt)).toBe(true);
  });

  it("rejects a value outside the four options", () => {
    expect(isTilWhere("Supplier")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isTilWhere("customer")).toBe(false);
  });
});

describe("normalizeSubmission", () => {
  it("parses the wire createdAt string into a real Date", () => {
    const result = normalizeSubmission({
      id: "1",
      title: "What I learned",
      who: "Jane Doe, CSM",
      where: "Customer",
      whereDetail: "Acme Corp",
      what: "Learned something.",
      submittedByEmail: "jane@wso2.com",
      createdAt: "2026-10-01T10:00:00.000Z",
    });
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.toISOString()).toBe("2026-10-01T10:00:00.000Z");
  });

  it("parses updatedAt when the entry has been edited", () => {
    const result = normalizeSubmission({
      id: "1",
      title: "T",
      who: "Jane",
      where: "Internal",
      whereDetail: null,
      what: "x",
      submittedByEmail: "jane@wso2.com",
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-02T09:30:00.000Z",
    });
    expect(result.updatedAt?.toISOString()).toBe("2026-10-02T09:30:00.000Z");
  });

  it("reads a never-edited entry as updatedAt null, with or without the field", () => {
    const base = {
      id: "1",
      title: "T",
      who: "Jane",
      where: "Internal" as const,
      whereDetail: null,
      what: "x",
      submittedByEmail: "jane@wso2.com",
      createdAt: "2026-10-01T10:00:00.000Z",
    };
    expect(normalizeSubmission({ ...base, updatedAt: null }).updatedAt).toBeNull();
    expect(normalizeSubmission(base).updatedAt).toBeNull();
  });

  it("passes every other field through unchanged", () => {
    const result = normalizeSubmission({
      id: "42",
      title: "A title",
      who: "Someone",
      where: "Internal",
      whereDetail: null,
      what: "A thing.",
      submittedByEmail: "someone@wso2.com",
      createdAt: "2026-10-01T10:00:00.000Z",
    });
    expect(result.id).toBe("42");
    expect(result.title).toBe("A title");
    expect(result.who).toBe("Someone");
    expect(result.where).toBe("Internal");
    expect(result.what).toBe("A thing.");
    expect(result.submittedByEmail).toBe("someone@wso2.com");
  });
});
