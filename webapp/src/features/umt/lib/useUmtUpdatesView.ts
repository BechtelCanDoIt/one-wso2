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

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { EMPTY_UMT_UPDATE_FILTERS, type UmtUpdateFilters } from "../api/umtUpdates";
import {
  UMT_UPDATES_RETURN_STATE,
  isUmtUpdatesReturn,
  readRememberedUmtUpdatesView,
  rememberUmtUpdatesView,
} from "./umtUpdatesFilterMemory";

// The Updates list's filters, page and page size, restored on a return and
// clean on any other arrival. See umtUpdatesFilterMemory for the rules.
export function useUmtUpdatesView(defaultPageSize: number) {
  const navigate = useNavigate();
  const location = useLocation();

  const [restored] = useState(() =>
    isUmtUpdatesReturn(location.state) ? readRememberedUmtUpdatesView() : null,
  );
  const [page, setPage] = useState(restored?.page ?? 0);
  const [pageSize, setPageSize] = useState(restored?.pageSize ?? defaultPageSize);
  const [filters, setFilters] = useState<UmtUpdateFilters>(restored?.filters ?? EMPTY_UMT_UPDATE_FILTERS);

  // Choosing Updates in the rail while already here is a new visit to the same
  // route, so the list stays mounted and the initial values above don't apply
  // again. A new history entry without the return marker resets them instead.
  const [seenLocationKey, setSeenLocationKey] = useState(location.key);
  if (location.key !== seenLocationKey) {
    setSeenLocationKey(location.key);
    if (!isUmtUpdatesReturn(location.state)) {
      setFilters(EMPTY_UMT_UPDATE_FILTERS);
      setPage(0);
      setPageSize(defaultPageSize);
    }
  }

  // Always what's on screen, so a fresh visit's clean view also replaces an
  // earlier visit's, and a later return can't bring that one back.
  useEffect(() => {
    rememberUmtUpdatesView({ filters, page, pageSize });
  }, [filters, page, pageSize]);

  useEffect(() => {
    if (isUmtUpdatesReturn(location.state)) return;
    // Stamped so the browser's Back to this entry counts as a return. The
    // entry's own state (such as the rail's fromPerspective) is kept.
    const current = location.state && typeof location.state === "object" ? location.state : {};
    void navigate(location, { replace: true, state: { ...current, ...UMT_UPDATES_RETURN_STATE } });
  }, [location, navigate]);

  return { filters, setFilters, page, setPage, pageSize, setPageSize };
}
