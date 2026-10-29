// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy at
// http://www.apache.org/licenses/LICENSE-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@asgardeo/react", () => ({ useAsgardeo: () => ({ isSignedIn: true }) }));
vi.mock("@hooks/useAsgardeoSub", async () => {
  const actual = await vi.importActual<typeof import("@hooks/useAsgardeoSub")>("@hooks/useAsgardeoSub");
  return {
    ...actual,
    useAsgardeoSub: () => ({ state: { status: "ready", sub: "user-under-test" }, retry: () => {} }),
  };
});
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));

const authedGet = vi.fn();
vi.mock("@api/http", async () => {
  const actual = await vi.importActual<typeof import("@api/http")>("@api/http");
  return { ...actual, authedGet: (...args: unknown[]) => authedGet(...(args as [])) };
});

(window as unknown as { config: Record<string, string> }).config = {
  ONE_WSO2_UMT_BACKEND_URL: "https://umt.example.com",
};

const {
  useUmtReleaseChunks,
  useUmtReleasedChunks,
  useUmtReleaseChunkRowStatuses,
  useUmtReleaseChunkDockerBuildStatus,
} = await import("./useUmtReleaseChunks");
const { umtServiceUrls } = await import("@config/apiConfig");

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { client, Wrapper: ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  ) };
}

beforeEach(() => {
  authedGet.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useUmtReleaseChunks", () => {
  it("GETs the pending release chunks list and maps its kebab-case update levels to camelCase", async () => {
    // The backend really does send update levels this way — see
    // umtReleaseChunks.test.ts. A hook that forgot to map this would hand the
    // UI an update level with no productName/productVersion/buildStatus at
    // all, which is what made every row render "N/A".
    authedGet.mockResolvedValue({
      releaseChunks: [
        {
          id: 1,
          updateIds: [1],
          updateLevels: [
            { "product-name": "wso2am", "product-version": "4.2.0", "build-status": "SUCCESS" },
          ],
        },
      ],
      totalPages: 3,
      pageSize: 20,
      totalCount: 41,
    });
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useUmtReleaseChunks({ page: 2, pageSize: 20 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    // The grid's pages are 0-based and the backend's 1-based, so the grid's
    // third page goes out as page=3.
    expect(authedGet).toHaveBeenCalledWith(
      umtServiceUrls.releaseChunksPage({ page: 2, pageSize: 20 }),
      "token",
    );
    expect(authedGet.mock.calls[0]?.[0]).toMatch(/\/update\/releaseChunk\?page=3&pageSize=20$/);
    expect(result.current.data).toEqual({
      chunks: [
        {
          id: 1,
          updateIds: [1],
          updateLevels: [
            {
              productName: "wso2am",
              productVersion: "4.2.0",
              buildStatus: "SUCCESS",
              tgBuildStatus: undefined,
            },
          ],
        },
      ],
      totalCount: 41,
    });
  });
});

describe("useUmtReleasedChunks", () => {
  it("GETs the released chunks list and maps its kebab-case update levels to camelCase", async () => {
    authedGet.mockResolvedValue({
      releaseChunks: [
        {
          id: 2,
          updateIds: [2],
          updateLevels: [
            { "product-name": "wso2is", "product-version": "7.0.0", "build-status": "SUCCESS" },
          ],
          status: "Released",
        },
      ],
      totalPages: 1,
      pageSize: 20,
      totalCount: 1,
    });
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useUmtReleasedChunks({ page: 0, pageSize: 20 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(authedGet.mock.calls[0]?.[0]).toMatch(
      /\/update\/releaseChunk\?states=released&page=1&pageSize=20$/,
    );
    expect(result.current.data?.totalCount).toBe(1);
    expect(result.current.data?.chunks[0]?.updateLevels).toEqual([
      { productName: "wso2is", productVersion: "7.0.0", buildStatus: "SUCCESS", tgBuildStatus: undefined },
    ]);
  });
});

describe("useUmtReleaseChunkRowStatuses", () => {
  it("fetches build-status and chunk-status in parallel for every id, mapping build-status's kebab-case levels", async () => {
    authedGet.mockImplementation((url: string) => {
      if (url === umtServiceUrls.releaseChunkBuildStatus(1)) {
        return Promise.resolve({
          id: 1,
          updateIds: [1],
          updateLevels: [
            {
              "product-name": "wso2ei",
              "product-version": "6.1.1",
              channel: "full",
              "update-level": 1,
              "applied-updates": [97],
              "build-status": "SUCCESS",
            },
          ],
        });
      }
      if (url === umtServiceUrls.releaseChunk(1)) {
        return Promise.resolve({ id: 1, updateIds: [1], status: "created" });
      }
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useUmtReleaseChunkRowStatuses([1]), { wrapper: Wrapper });

    await waitFor(() => expect(result.current[1]?.chunkStatus).toBeDefined());

    expect(result.current[1]?.buildStatus).toEqual({
      id: 1,
      updateIds: [1],
      overallCstBuildStatus: undefined,
      updateLevels: [
        {
          productName: "wso2ei",
          productVersion: "6.1.1",
          channel: "full",
          updateLevel: 1,
          appliedUpdates: [97],
          buildStatus: "SUCCESS",
          tgBuildStatus: undefined,
        },
      ],
    });
    expect(result.current[1]?.chunkStatus).toEqual({ id: 1, updateIds: [1], status: "created" });
  });

  it("returns an empty map for an empty id list without calling the backend", () => {
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useUmtReleaseChunkRowStatuses([]), { wrapper: Wrapper });

    expect(result.current).toEqual({});
    expect(authedGet).not.toHaveBeenCalled();
  });

  describe("a chunk whose status is changing", () => {
    // Serves each chunk id the status the test last set for it.
    const statuses: Record<number, string> = {};
    function serveStatuses() {
      authedGet.mockImplementation((url: string) => {
        for (const id of Object.keys(statuses).map(Number)) {
          if (url === umtServiceUrls.releaseChunk(id)) return Promise.resolve({ id, updateIds: [id], status: statuses[id] });
          if (url === umtServiceUrls.releaseChunkBuildStatus(id)) return Promise.resolve({ id, updateIds: [id], updateLevels: [] });
        }
        return Promise.reject(new Error(`unexpected url ${url}`));
      });
    }

    // The interval the chunk's status query is polling by right now.
    function statusInterval(client: QueryClient, id: number) {
      const query = client.getQueryCache().find({ queryKey: ["umt-release-chunk-status", "user-under-test", id] });
      return (query?.options as unknown as { refetchInterval: (q: unknown) => number | false }).refetchInterval(query);
    }

    it.each(["requestedToCreate", "requestedToRelease", "releasing", "retriggering"])(
      "is read again every few seconds while it is %s",
      async (status) => {
        statuses[1] = status;
        serveStatuses();
        const { client, Wrapper } = wrapper();
        const { result } = renderHook(() => useUmtReleaseChunkRowStatuses([1]), { wrapper: Wrapper });
        await waitFor(() => expect(result.current[1]?.chunkStatus).toBeDefined());

        expect(statusInterval(client, 1)).toBe(5000);
      },
    );

    it.each(["created", "releasingFailed", "releasingDockerFailed", "Released"])(
      "is not read again once it is %s",
      async (status) => {
        statuses[1] = status;
        serveStatuses();
        const { client, Wrapper } = wrapper();
        const { result } = renderHook(() => useUmtReleaseChunkRowStatuses([1]), { wrapper: Wrapper });
        await waitFor(() => expect(result.current[1]?.chunkStatus).toBeDefined());

        expect(statusInterval(client, 1)).toBe(false);
      },
    );

    it("refreshes the chunk lists and that chunk's builds once it settles, and not before", async () => {
      statuses[1] = "releasing";
      serveStatuses();
      const { client, Wrapper } = wrapper();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      const { result } = renderHook(() => useUmtReleaseChunkRowStatuses([1]), { wrapper: Wrapper });
      await waitFor(() => expect(result.current[1]?.chunkStatus?.status).toBe("releasing"));
      expect(invalidate).not.toHaveBeenCalled();

      statuses[1] = "Released";
      await client.refetchQueries({ queryKey: ["umt-release-chunk-status"] });

      await waitFor(() => expect(result.current[1]?.chunkStatus?.status).toBe("Released"));
      await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["umt-release-chunks"] }));
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["umt-released-chunks"] });
      expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ predicate: expect.any(Function) }));
    });

    it("does not refresh the lists for a chunk that was never in progress", async () => {
      statuses[1] = "created";
      serveStatuses();
      const { client, Wrapper } = wrapper();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      const { result } = renderHook(() => useUmtReleaseChunkRowStatuses([1]), { wrapper: Wrapper });
      await waitFor(() => expect(result.current[1]?.chunkStatus?.status).toBe("created"));

      statuses[1] = "releasingFailed";
      await client.refetchQueries({ queryKey: ["umt-release-chunk-status"] });
      await waitFor(() => expect(result.current[1]?.chunkStatus?.status).toBe("releasingFailed"));

      expect(invalidate).not.toHaveBeenCalled();
    });
  });
});

describe("useUmtReleaseChunkDockerBuildStatus", () => {
  it("does not fetch while disabled", () => {
    const { Wrapper } = wrapper();
    renderHook(() => useUmtReleaseChunkDockerBuildStatus(1, false), { wrapper: Wrapper });
    expect(authedGet).not.toHaveBeenCalled();
  });

  it("fetches docker build statuses once enabled", async () => {
    authedGet.mockResolvedValue([{ productName: "apim", productVersion: "4.2.0", buildStatus: "SUCCESS" }]);
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useUmtReleaseChunkDockerBuildStatus(1, true), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(authedGet).toHaveBeenCalledWith(umtServiceUrls.releaseChunkDockerBuildStatus(1), "token");
  });
});
