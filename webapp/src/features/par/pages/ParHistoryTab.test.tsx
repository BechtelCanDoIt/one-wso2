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
import type { ParCycle } from "../api/types";

const downloadPar2Pdf = vi.fn();
const retryLookup = vi.fn();
let leadership360: { data?: unknown; isLoading: boolean; failed?: { error: unknown; retry: () => void; retrying: boolean } };

vi.mock("../api/useParData", () => ({
  useParRating: () => ({ data: { parRatingId: 9, parLeadComment: "" }, isLoading: false, isError: false }),
  useClosedParCycles: () => ({ data: [] }),
}));
vi.mock("../api/useSelfReview", () => ({
  useSelfReview: () => ({
    data: { template: { definition: { sections: [] } }, answers: {} },
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("../api/useLeadership360", () => ({ useCycleLeadership360ForPdf: () => leadership360 }));
vi.mock("../components/ParRatingSummary", () => ({
  default: ({ onDownloadPdf }: { onDownloadPdf?: () => void }) =>
    onDownloadPdf ? <button onClick={onDownloadPdf}>Download PDF</button> : null,
}));
vi.mock("../components/ParSelfReviewView", () => ({ default: () => null }));
vi.mock("../components/Leadership360ResultsCard", () => ({ default: () => null }));
vi.mock("../util/parPdf", () => ({ downloadPar2Pdf: (...args: unknown[]) => downloadPar2Pdf(...args) }));

const { RealCycleDetail } = await import("./ParHistoryTab");

const cycle = { parCycleId: 4 } as ParCycle;

beforeEach(() => {
  downloadPar2Pdf.mockReset();
  retryLookup.mockReset();
  leadership360 = { data: undefined, isLoading: false };
});

describe("History's PAR 2.0 record", () => {
  it("offers the PDF once a leader's Leadership 360° lookup is done", () => {
    render(<RealCycleDetail cycle={cycle} workEmail="me@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(downloadPar2Pdf).toHaveBeenCalledTimes(1);
  });

  it("waits for the lookup before offering the PDF", () => {
    leadership360 = { data: undefined, isLoading: true };
    render(<RealCycleDetail cycle={cycle} workEmail="me@example.com" />);
    expect(screen.queryByRole("button", { name: "Download PDF" })).not.toBeInTheDocument();
  });

  it("offers the lookup again when it failed, rather than a PDF without the results", () => {
    leadership360 = { isLoading: false, failed: { error: new Error("Unavailable"), retry: retryLookup, retrying: false } };
    render(<RealCycleDetail cycle={cycle} workEmail="me@example.com" />);
    expect(screen.queryByRole("button", { name: "Download PDF" })).not.toBeInTheDocument();
    expect(screen.getByText(/Couldn't load your Leadership 360° results for the PDF/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retryLookup).toHaveBeenCalled();
  });
});
