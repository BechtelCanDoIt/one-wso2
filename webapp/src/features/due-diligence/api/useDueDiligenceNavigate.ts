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

import { useCallback } from "react";
import { useLocation, useNavigate, type NavigateOptions, type To } from "react-router";

/**
 * A drop-in replacement for react-router's `useNavigate()` for any Due
 * Diligence page.
 *
 * It re-attaches the current page's `state: { fromPerspective }` to every
 * navigation the page makes, so it survives however many hops deep the user
 * goes. That mattered while Due Diligence lived at a neutral /due-diligence/*
 * prefix, where the state was the only thing keeping the rail on Finance or
 * Legal. The pages now live under /legal/due-diligence (DUE_DILIGENCE_BASE_PATH),
 * where the URL itself selects the Legal rail (PerspectiveContext checks the
 * path first), so the state no longer changes anything here. It is kept so the
 * move stays a route-only change; plain useNavigate() can replace it later.
 */
export function useDueDiligenceNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPerspective = (location.state as { fromPerspective?: string } | null)?.fromPerspective;

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        navigate(to);
        return;
      }
      if (!fromPerspective) {
        navigate(to, options);
        return;
      }
      navigate(to, {
        ...options,
        state: { fromPerspective, ...(options?.state as object | undefined) },
      });
    },
    [navigate, fromPerspective],
  );
}
