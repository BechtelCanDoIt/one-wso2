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
import type { SmartSearchSource } from "../api/smartSearchTypes";
import { ANSWER_TEXT, CONTENTS, EMAIL_SOURCE, SOURCES_RESPONSE } from "../testing/fixtures";
import { buildCopyText } from "./libraryCopyText";
import { groupResults } from "./libraryResults";

const groups = groupResults(SOURCES_RESPONSE.sources, CONTENTS, "wso2con");

const TEST_LINE = "TEST (Page 9)";
const TEST_LINK = "https://drive.google.com/file/d/1yXy8JmH2z7TNmfs1_I30XQTr14cIkU_4/view?usp=drive_link";
const DECK_LINE = "WSO2Con 2025 - Regional Presentation (Slide 5)";
const DECK_LINK =
  "https://docs.google.com/presentation/d/1jnIhpsBA00e4EJ8BIvaIkD1MwvDHOx-XPommKUo9Fe4/present?slide=id.g2f820b48fab_0_28";

describe("buildCopyText as plain text", () => {
  it("is the answer, then the first three sources with their links", () => {
    const text = buildCopyText("plain", { query: "wso2con", answer: ANSWER_TEXT, groups });
    const lines = text.split("\n");
    expect(lines[0]).toBe(ANSWER_TEXT);
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("Sources:");
    expect(lines[3]).toBe(`1. ${TEST_LINE} - ${TEST_LINK}`);
    expect(lines[4]).toBe(`2. ${DECK_LINE} - ${DECK_LINK}`);
    expect(lines[5]).toMatch(/^3\. WSO2Con Asia - Customer Email \(Section 1\) - https:\/\/docs\.google\.com\//);
    expect(lines).toHaveLength(6);
  });

  it("is just the sources when there is no answer", () => {
    const text = buildCopyText("plain", { query: "wso2con", answer: null, groups });
    expect(text.startsWith("Sources:\n1. ")).toBe(true);
  });

  it("falls back to the question when there is nothing else to say", () => {
    expect(buildCopyText("plain", { query: "  wso2con ", answer: null, groups: [] })).toBe("wso2con");
  });
});

describe("buildCopyText as a chat message", () => {
  it("is the answer, then one bullet per source", () => {
    const text = buildCopyText("chat", { query: "wso2con", answer: "Short answer.", groups });
    expect(text.split("\n")).toEqual([
      "Short answer.",
      `• ${TEST_LINE} ${TEST_LINK}`,
      `• ${DECK_LINE} ${DECK_LINK}`,
      expect.stringContaining("• WSO2Con Asia - Customer Email (Section 1) https://docs.google.com/"),
    ]);
  });

  it("opens with the question when there is no answer", () => {
    expect(buildCopyText("chat", { query: "wso2con", answer: null, groups }).split("\n")[0]).toBe("wso2con");
  });

  it("keeps a long answer to a chat-sized message", () => {
    const first = buildCopyText("chat", { query: "q", answer: "word ".repeat(200), groups }).split("\n")[0] ?? "";
    expect(first.length).toBeLessThanOrEqual(280);
    expect(first.endsWith("…")).toBe(true);
  });
});

describe("buildCopyText as an email", () => {
  it("has a subject, a greeting to fill in, the answer, the sources and a sign-off", () => {
    const text = buildCopyText("email", { query: "wso2con", answer: ANSWER_TEXT, groups });
    expect(text.startsWith(`Subject: wso2con\n\nHi [Name],\n\n${ANSWER_TEXT}\n\nWhere to find more:\n- ${TEST_LINE}: ${TEST_LINK}\n`)).toBe(true);
    expect(text.endsWith("\n\nBest regards,")).toBe(true);
  });

  it("offers a place to start when there is no answer", () => {
    const text = buildCopyText("email", { query: "wso2con", answer: null, groups });
    expect(text).toContain("Here is where to start:");
    expect(text).not.toContain("Where to find more:");
    expect(text).toContain(`- ${DECK_LINE}: ${DECK_LINK}`);
  });

  it("shortens a long question to fit a subject line", () => {
    const text = buildCopyText("email", { query: "a".repeat(200), answer: null, groups });
    const subject = text.split("\n")[0] ?? "";
    expect(subject.length).toBeLessThanOrEqual("Subject: ".length + 80);
    expect(subject.endsWith("…")).toBe(true);
  });
});

describe("what gets pointed to", () => {
  it("skips a result with nowhere safe to open, and takes the next", () => {
    const unsafe: SmartSearchSource = { ...EMAIL_SOURCE, driveLink: "http://insecure.example/x", nativeLink: "" };
    const mixed = groupResults([unsafe, ...SOURCES_RESPONSE.sources.slice(0, 2)], CONTENTS, "q");
    const text = buildCopyText("plain", { query: "q", answer: null, groups: mixed });
    expect(text).not.toContain("insecure.example");
    expect(text).toContain("1. TEST");
  });

  it("never lists more than three", () => {
    const text = buildCopyText("plain", { query: "q", answer: null, groups });
    expect(text.match(/^\d\. /gm)).toHaveLength(3);
  });

  it("uses a document's best passage that has a link", () => {
    const firstUnsafe: SmartSearchSource = { ...EMAIL_SOURCE, driveLink: "http://insecure.example/x", nativeLink: "", page: 1 };
    const secondSafe: SmartSearchSource = { ...EMAIL_SOURCE, page: 4 };
    const [group] = groupResults([firstUnsafe, secondSafe], [], "q");
    expect(buildCopyText("plain", { query: "q", answer: null, groups: group ? [group] : [] })).toContain("(Section 4)");
  });
});
