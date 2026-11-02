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
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ReportingLineNote from "./ReportingLineNote";
import type { ReportingLine } from "../../api/types";

function renderNote(line: ReportingLine | undefined) {
  return render(
    <MemoryRouter>
      <ReportingLineNote line={line} />
    </MemoryRouter>,
  );
}

const THROUGH = { employeeId: "LK100002", firstName: "Test", lastName: "Person" };

describe("ReportingLineNote", () => {
  it("says the viewer is their additional manager", () => {
    renderNote({ relation: "ADDITIONAL", through: null });
    expect(screen.getByText("You're their additional manager.")).toBeInTheDocument();
  });

  // The question the list can't answer: why is someone further down here at all.
  it("names the additional report an indirect report came through, and links to them", () => {
    const { container } = renderNote({ relation: "INDIRECT", through: THROUGH });
    expect(container).toHaveTextContent(
      "In your team through Test Person, whom you're an additional manager of.",
    );
    expect(screen.getByRole("link", { name: "Test Person" })).toHaveAttribute(
      "href",
      "/me/my-team/LK100002",
    );
  });

  // Ordinary reports need no explanation, and a missing answer (still
  // loading, failed, or a backend without the endpoint) must not block the page.
  it("says nothing otherwise", () => {
    for (const line of [
      { relation: "DIRECT", through: null },
      { relation: "INDIRECT", through: null },
      undefined,
    ] as const) {
      const { container, unmount } = renderNote(line);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });
});
