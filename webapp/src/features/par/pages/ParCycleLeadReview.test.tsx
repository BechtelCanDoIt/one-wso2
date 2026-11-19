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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ParRating } from "../api/types";

let rating: Partial<ParRating>;
const downloadPar2Pdf = vi.fn();

vi.mock("@features/my/api/useMeProfile", () => ({
  useMeProfile: () => ({ data: { userInfo: { workEmail: "me@example.com" } }, isLoading: false }),
}));
vi.mock("../api/useParData", () => ({
  useActiveParCycle: () => ({ data: [{ parCycleId: 2 }], isLoading: false, isError: false }),
  useParRating: () => ({ data: rating, isLoading: false, isError: false }),
}));
vi.mock("../api/useSelfReview", () => ({
  useSelfReview: () => ({ data: { template: { definition: { sections: [] } }, answers: {} } }),
}));
vi.mock("../api/useReview360", () => ({ useReviewSummary: () => ({ data: undefined }) }));
vi.mock("../api/useLeadership360", () => ({ useCycleLeadership360ForPdf: () => undefined }));
vi.mock("@features/leave/api/useLeaveData", () => ({ useLeaveEmployees: () => ({ data: [] }) }));
vi.mock("../util/parPdf", () => ({ downloadPar2Pdf: (...args: unknown[]) => downloadPar2Pdf(...args) }));

const { default: ParCycleLeadReview } = await import("./ParCycleLeadReview");

beforeEach(() => {
  rating = { parRatingId: 9, parEmployeeStatus: "SHARED", parLeadStatus: "DRAFT" };
  downloadPar2Pdf.mockReset();
});

describe("ParCycleLeadReview", () => {
  it("says the lead's review shows here once they share it", () => {
    render(<ParCycleLeadReview />);
    expect(screen.getByText("Your lead's review shows here once they share it.")).toBeInTheDocument();
    expect(screen.queryByText("Lead's feedback")).not.toBeInTheDocument();
  });

  it("shows the lead's feedback once shared, with the PAR's PDF", () => {
    rating = { ...rating, parLeadStatus: "SHARED", parRating: "Successful", parLeadComment: "PHA+R29vZDwvcD4=" };
    render(<ParCycleLeadReview />);
    expect(screen.getByText("Lead's feedback")).toBeInTheDocument();
    expect(screen.getByText(/PAR rating: /)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(downloadPar2Pdf).toHaveBeenCalledTimes(1);
  });
});
