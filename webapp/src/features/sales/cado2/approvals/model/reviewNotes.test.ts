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
import type { ReviewNote } from "@features/sales/cado2/approvals/api/approvalTypes";
import { noteText, stateLabel } from "./reviewNotes";

const note = (over: Partial<ReviewNote>): ReviewNote => ({
  key: "DISCOUNT.L2", rule: "DISCOUNT", lineNumber: 2,
  reasons: ["Year 1 · line 2 · WSO2 API Manager (APIM): 18% discount is above the Account Manager's 15% limit"],
  roles: ["Regional Director · NA"], target: "line:2", yoursToWrite: false, state: "OPEN",
  markedByEmail: null, markedAt: null, markedOnVersion: null, ...over,
});

// D129: a note's words, from the rule sentences.
describe("noteText", () => {
  it("leads a discount with its figure and names who approves it", () => {
    expect(noteText(note({}), "DEAL_DESK")).toEqual({
      title: "18% discount",
      detail: "Above the Account Manager's 15% limit",
      who: "Regional Director · NA approves after you",
    });
    expect(noteText(note({ roles: ["Regional Director · NA", "CFO"] }), "DEAL_DESK").who).toBe("Regional Director · NA and CFO approve after you");
  });

  it("words Deal Desk's own checks and what is written, not marked", () => {
    expect(noteText(note({ rule: "AM_CATEGORY", roles: [], reasons: ["Line 2 · Migration: category chosen by the AM: Professional Service"] }), "DEAL_DESK"))
      .toEqual({ title: "Category chosen by the AM", detail: "Professional Service", who: "Only Deal Desk checks this" });
    expect(noteText(note({ rule: "RENEWAL_START", lineNumber: 0, roles: [], reasons: ["Starts 1 Mar 2027, not 1 Feb 2027, the day after APIM ends"] }), "DEAL_DESK").title)
      .toBe("Start date");
    expect(noteText(note({ rule: "SEE_SPECIAL_TERMS", lineNumber: 0, roles: [], yoursToWrite: true }), "DEAL_DESK").who).toBe("Yours to write");
    expect(noteText(note({ rule: "SPECIAL_TERMS", lineNumber: 0, roles: [], reasons: ["The quote includes special terms"] }), "LEGAL"))
      .toEqual({ title: "Special terms", detail: "The quote includes special terms", who: "Why you're asked" });
  });
});

describe("stateLabel", () => {
  it("says who found it fine, on which version, or that it changed", () => {
    expect(stateLabel(note({}))).toBe("To look at");
    expect(stateLabel(note({ state: "FINE", markedByEmail: "priya@wso2.com" }))).toBe("Looks fine · priya");
    expect(stateLabel(note({ state: "FINE", markedByEmail: "priya@wso2.com", markedOnVersion: 1 }))).toBe("Looks fine on v1 · priya");
    expect(stateLabel(note({ state: "CHANGED", markedOnVersion: 1 }))).toBe("Changed since v1");
    expect(stateLabel(note({ state: "FINE", yoursToWrite: true }))).toBe("Written");
    expect(stateLabel(note({ state: "FINE", byApproval: true, markedByEmail: "arjun@wso2.com" }))).toBe("Approved · arjun");
  });
});
