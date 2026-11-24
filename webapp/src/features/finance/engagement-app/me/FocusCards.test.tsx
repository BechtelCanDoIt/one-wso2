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
import type { TravelRequestSummary } from "../api/engagementTypes";
import { TravelsFocus } from "./FocusCards";

const trip = (over: Partial<TravelRequestSummary>): TravelRequestSummary => ({
  jobNumber: "TRV-1",
  status: "New",
  traveller: { email: "a@wso2.com", name: "A" },
  country: "India",
  city: "Pune",
  start: "2020-01-01",
  end: "2020-01-05",
  ...over,
});

const draw = (trips: TravelRequestSummary[]) =>
  render(
    <MemoryRouter>
      <TravelsFocus trips={trips} />
    </MemoryRouter>,
  );

describe("TravelsFocus", () => {
  it("keeps an In Progress or Extended trip after its planned end until it is Completed", () => {
    draw([trip({ jobNumber: "TRV-A", status: "In Progress" }), trip({ jobNumber: "TRV-B", status: "Extended" })]);
    expect(screen.getByText("TRV-A")).toBeInTheDocument();
    expect(screen.getByText("TRV-B")).toBeInTheDocument();
  });

  it("drops a New or On Hold trip whose end date has passed, and a Completed one", () => {
    draw([trip({ jobNumber: "TRV-C", status: "New" }), trip({ jobNumber: "TRV-D", status: "On Hold" }), trip({ jobNumber: "TRV-E", status: "Completed" })]);
    expect(screen.queryByText("TRV-C")).toBeNull();
    expect(screen.queryByText("TRV-D")).toBeNull();
    expect(screen.queryByText("TRV-E")).toBeNull();
  });
});
