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
import type { ParLegacyQuestionAnswer } from "../api/types";
import { getLegacyQuestionGroups } from "./legacyParCatalogs";

describe("getLegacyQuestionGroups", () => {
  describe("uncatalogued cycle", () => {
    const cycleName = "2099 Future Cycle";
    const answers: ParLegacyQuestionAnswer[] = [
      { title: "Lead question", employeeAnswer: null, managerFeedback: "lead answer" },
      { title: "Employee question", employeeAnswer: "employee answer", managerFeedback: null },
      { title: "Shared question", employeeAnswer: "employee shared", managerFeedback: "lead shared" },
      { title: "Blank question", employeeAnswer: "N/A", managerFeedback: "  " },
      { title: "360 Confirmation.", employeeAnswer: null, managerFeedback: "Yes" },
    ];

    it("keeps only each side's own answered questions, in stored order", () => {
      const employeeGroups = getLegacyQuestionGroups(cycleName, answers, "employee");
      const leadGroups = getLegacyQuestionGroups(cycleName, answers, "lead");

      expect(employeeGroups?.[0].rows.map((row) => row.label)).toEqual(["Employee question", "Shared question"]);
      expect(leadGroups?.[0].rows.map((row) => row.label)).toEqual(["Lead question", "Shared question"]);
      expect(employeeGroups?.[0].title).toBe("Employee Feedback");
      expect(leadGroups?.[0].title).toBe("Lead Feedback");
    });

    it("returns null when a side has no answers", () => {
      const employeeOnly = answers.filter((qa) => qa.title === "Employee question");

      expect(getLegacyQuestionGroups(cycleName, employeeOnly, "lead")).toBeNull();
    });
  });

  describe("employeeOnly / leadOnly questions", () => {
    const labels = (groups: ReturnType<typeof getLegacyQuestionGroups>) => groups?.[0].rows.map((row) => row.label) ?? [];

    it("shows a leadOnly question on the lead side and hides it on the employee side when the employee has no answer", () => {
      const answers: ParLegacyQuestionAnswer[] = [
        { title: "Promotion confirmed?", employeeAnswer: null, managerFeedback: "No" },
      ];
      expect(labels(getLegacyQuestionGroups("2017 Quarterly Review - Q1", answers, "lead"))).toContain("Promotion confirmed?");
      expect(getLegacyQuestionGroups("2017 Quarterly Review - Q1", answers, "employee")).toBeNull();
    });

    it("treats an employee's \"N/A\" on a leadOnly question as no answer", () => {
      const answers: ParLegacyQuestionAnswer[] = [
        { title: "Promotion confirmed?", employeeAnswer: "N/A", managerFeedback: "No" },
      ];
      expect(getLegacyQuestionGroups("2017 Quarterly Review - Q1", answers, "employee")).toBeNull();
    });

    it("shows a leadOnly question on the employee side when the employee gave a real answer", () => {
      const answers: ParLegacyQuestionAnswer[] = [
        { title: "Promotion confirmed?", employeeAnswer: "Yes, discussed", managerFeedback: "No" },
      ];
      const employeeGroups = getLegacyQuestionGroups("2017 Quarterly Review - Q1", answers, "employee");
      expect(labels(employeeGroups)).toEqual(["Promotion confirmed?"]);
      expect(employeeGroups?.[0].rows[0].employeeAnswer).toBe("Yes, discussed");
    });

    it("hides an employeeOnly question on the lead side unless the lead gave a real answer", () => {
      const question = "Your Commitments & Your Feedback On The Quarter.";
      const withoutLead: ParLegacyQuestionAnswer[] = [{ title: question, employeeAnswer: "My commitments", managerFeedback: " " }];
      const withLead: ParLegacyQuestionAnswer[] = [{ title: question, employeeAnswer: "My commitments", managerFeedback: "Agreed" }];

      expect(labels(getLegacyQuestionGroups("2019 Performance Evaluation - Q1", withoutLead, "employee"))).toEqual([question]);
      expect(getLegacyQuestionGroups("2019 Performance Evaluation - Q1", withoutLead, "lead")).toBeNull();
      expect(labels(getLegacyQuestionGroups("2019 Performance Evaluation - Q1", withLead, "lead"))).toEqual([question]);
    });
  });
});
