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
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import LegacyDueDiligenceRedirect from "./LegacyDueDiligenceRedirect";

function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="url">{pathname + search}</div>;
}

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="due-diligence/*" element={<LegacyDueDiligenceRedirect />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  return screen.getByTestId("url").textContent;
}

describe("LegacyDueDiligenceRedirect", () => {
  it("sends an old address to the same page under /legal", () => {
    expect(renderAt("/due-diligence/partners/12/profile")).toBe("/legal/due-diligence/partners/12/profile");
  });

  it("keeps the query string, so old file-viewer links still open the file", () => {
    expect(renderAt("/due-diligence/view-pdf?fileName=a.pdf&extension=pdf&from=legal")).toBe(
      "/legal/due-diligence/view-pdf?fileName=a.pdf&extension=pdf&from=legal",
    );
  });

  it("sends the bare old entry point to the new one", () => {
    expect(renderAt("/due-diligence")).toBe("/legal/due-diligence");
  });
});
