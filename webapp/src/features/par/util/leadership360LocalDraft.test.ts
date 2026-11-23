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

import { beforeEach, describe, expect, it } from "vitest";
import { SIGNING_OUT_EVENT } from "@constants/appEvents";
import { readLocalDraft, writeLocalDraft } from "./leadership360LocalDraft";

beforeEach(() => {
  localStorage.clear();
});

describe("anonymous Leadership 360° drafts", () => {
  it("are removed on sign-out, everyone's, leaving other keys alone", () => {
    writeLocalDraft("ana@example.com", 3, "lead@example.com", { q1: 4 });
    writeLocalDraft("ben@example.com", 3, "lead@example.com", { q1: 2 });
    localStorage.setItem("one-wso2.pinned.v1.someone", "[]");

    window.dispatchEvent(new CustomEvent(SIGNING_OUT_EVENT));

    expect(readLocalDraft("ana@example.com", 3, "lead@example.com")).toBeNull();
    expect(readLocalDraft("ben@example.com", 3, "lead@example.com")).toBeNull();
    expect(localStorage.getItem("one-wso2.pinned.v1.someone")).toBe("[]");
  });
});
