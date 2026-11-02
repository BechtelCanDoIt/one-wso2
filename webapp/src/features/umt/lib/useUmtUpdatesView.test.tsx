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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

// The Updates list's view comes back on a return to its history entry, and
// starts clean on any other arrival: a fresh visit, a refresh (an empty
// memory), or choosing Updates again while already on it.

import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { EMPTY_UMT_UPDATE_FILTERS, type UmtUpdateFilters } from "../api/umtUpdates";
import { umtPaths } from "./umtPaths";
import {
  UMT_UPDATES_RETURN_STATE,
  readRememberedUmtUpdatesView,
  rememberUmtUpdatesView,
} from "./umtUpdatesFilterMemory";
import { useUmtUpdatesView } from "./useUmtUpdatesView";

const DEFAULT_PAGE_SIZE = 10;

const FILTERED: UmtUpdateFilters = { ...EMPTY_UMT_UPDATE_FILTERS, lifecycleState: "Development" };
const REMEMBERED = { filters: FILTERED, page: 2, pageSize: 25 };
const CLEAN = { filters: EMPTY_UMT_UPDATE_FILTERS, page: 0, pageSize: DEFAULT_PAGE_SIZE };

// The hook alongside the router's location and navigate, so a test can read
// the entry's state and move to another entry while the hook stays mounted.
function renderView(state?: unknown) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[{ pathname: umtPaths.updates, state }]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => ({ view: useUmtUpdatesView(DEFAULT_PAGE_SIZE), location: useLocation(), navigate: useNavigate() }),
    { wrapper },
  );
}

const viewOf = ({ filters, page, pageSize }: { filters: UmtUpdateFilters; page: number; pageSize: number }) => ({
  filters,
  page,
  pageSize,
});

describe("useUmtUpdatesView", () => {
  it("restores the remembered view on a return", () => {
    rememberUmtUpdatesView(REMEMBERED);

    const { result } = renderView(UMT_UPDATES_RETURN_STATE);

    expect(viewOf(result.current.view)).toEqual(REMEMBERED);
  });

  it("starts clean on a fresh visit, and forgets the earlier view", () => {
    rememberUmtUpdatesView(REMEMBERED);

    const { result } = renderView();

    expect(viewOf(result.current.view)).toEqual(CLEAN);
    expect(readRememberedUmtUpdatesView()).toEqual(CLEAN);
  });

  it("stamps a fresh visit's entry as a return, keeping the state already on it", () => {
    const { result } = renderView({ fromPerspective: "engineering" });

    expect(result.current.location.state).toEqual({ fromPerspective: "engineering", ...UMT_UPDATES_RETURN_STATE });
  });

  it("remembers the view as it changes", () => {
    const { result } = renderView();

    act(() => {
      result.current.view.setFilters(FILTERED);
      result.current.view.setPage(2);
      result.current.view.setPageSize(25);
    });

    expect(readRememberedUmtUpdatesView()).toEqual(REMEMBERED);
  });

  it("resets when Updates is chosen again while it is already open", () => {
    const { result } = renderView();
    act(() => {
      result.current.view.setFilters(FILTERED);
      result.current.view.setPage(2);
      result.current.view.setPageSize(25);
    });

    act(() => {
      void result.current.navigate(umtPaths.updates);
    });

    expect(viewOf(result.current.view)).toEqual(CLEAN);
  });
});
