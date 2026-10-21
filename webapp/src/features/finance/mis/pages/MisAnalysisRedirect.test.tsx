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
import { misPaths } from "@constants/misApps";
import MisAnalysisRedirect from "./MisAnalysisRedirect";

function PortfolioStub() {
  const { pathname, search } = useLocation();
  return <p>{`${pathname}${search}`}</p>;
}

function open(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path={misPaths.legacyAnalysis} element={<MisAnalysisRedirect />} />
        <Route path={misPaths.portfolio} element={<PortfolioStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("the old ARR Analysis address", () => {
  it("lands on Portfolio", () => {
    open(misPaths.legacyAnalysis);
    expect(screen.getByText("/finance/mis/portfolio")).toBeInTheDocument();
  });

  it("keeps the query string, so a saved link opens the same view", () => {
    open(`${misPaths.legacyAnalysis}?region=EMEA&scale=thousands`);
    expect(screen.getByText("/finance/mis/portfolio?region=EMEA&scale=thousands")).toBeInTheDocument();
  });
});
