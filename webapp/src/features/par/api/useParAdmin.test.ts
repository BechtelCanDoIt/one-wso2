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
import { renderHook } from "@testing-library/react";

// Captures the query useLegacyParHistoryByCycle builds, so tests can run its
// own queryFn and assert on the real fallback logic.
let capturedQuery: { queryFn: () => Promise<unknown> } | undefined;
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryFn: () => Promise<unknown> }) => {
    capturedQuery = options;
    return { data: undefined, isLoading: true, isError: false };
  },
}));
vi.mock("@asgardeo/react", () => ({ useAsgardeo: () => ({ isSignedIn: true }) }));
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
vi.mock("@api/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@api/http")>();
  return { ...actual, authedGet: vi.fn() };
});

const { authedGet, HttpError } = await import("@api/http");
const { useLegacyParHistoryByCycle } = await import("./useParAdmin");

const CYCLE = "2016 Quarterly Review - Q3/Q4";
const rows = [{ legacyHeaderId: 1 }];

function runQuery() {
  renderHook(() => useLegacyParHistoryByCycle(CYCLE));
  return capturedQuery!.queryFn();
}

const calledUrls = () => vi.mocked(authedGet).mock.calls.map(([url]) => new URL(url, "http://x"));

beforeEach(() => {
  vi.mocked(authedGet).mockReset();
});

describe("useLegacyParHistoryByCycle", () => {
  it("asks the query-parameter route, with the cycle name in the query string", async () => {
    vi.mocked(authedGet).mockResolvedValueOnce(rows);
    await expect(runQuery()).resolves.toEqual(rows);
    const [url] = calledUrls();
    expect(calledUrls()).toHaveLength(1);
    expect(url.pathname).toMatch(/\/legacy-par-history-cycles\/participants$/);
    expect(url.searchParams.get("cycleName")).toBe(CYCLE);
    expect(url.searchParams.get("summary")).toBe("true");
  });

  it.each([404, 405])("falls back to the path route when the backend doesn't have the new one yet (%i)", async (status) => {
    vi.mocked(authedGet).mockRejectedValueOnce(new HttpError("url", status, "")).mockResolvedValueOnce(rows);
    await expect(runQuery()).resolves.toEqual(rows);
    const [, fallback] = calledUrls();
    expect(calledUrls()).toHaveLength(2);
    expect(fallback.pathname).toContain("/legacy-par-history-cycles/");
    expect(fallback.pathname).toMatch(/\/participants$/);
    expect(fallback.searchParams.get("summary")).toBe("true");
  });

  it.each([400, 403, 500])("rethrows any other error without a second request (%i)", async (status) => {
    vi.mocked(authedGet).mockRejectedValueOnce(new HttpError("url", status, ""));
    await expect(runQuery()).rejects.toMatchObject({ status });
    expect(calledUrls()).toHaveLength(1);
  });

  it("surfaces the path route's own error when the fallback fails too", async () => {
    // e.g. enableLegacyParDataView off: both routes answer 404.
    vi.mocked(authedGet)
      .mockRejectedValueOnce(new HttpError("url", 404, ""))
      .mockRejectedValueOnce(new HttpError("url", 404, "path"));
    await expect(runQuery()).rejects.toMatchObject({ status: 404, responseBody: "path" });
  });
});
