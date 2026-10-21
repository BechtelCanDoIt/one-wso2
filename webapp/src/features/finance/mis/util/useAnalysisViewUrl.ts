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

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import type { MisAnalysisFilters } from "./misAnalysisFilters";
import { parseAnalysisView, serializeAnalysisView, type OfferedPlaces } from "./misAnalysisViewState";
import type { MisCivilDate } from "./misPacificTime";
import { useScalePreference } from "./ScalePreferenceContext";

/**
 * Portfolio's filters, restored from the address once on load and written back
 * as they change.
 *
 * The address is read once rather than followed: the filters are live controls
 * that settle after a debounce, so they are the state and the address mirrors
 * them. The write replaces the history entry, so Back leaves Portfolio instead
 * of stepping through every filter tried.
 *
 * A place in the link that the backend does not offer is dropped on load, so
 * a link naming a Sales Region that does not exist opens unfiltered.
 *
 * A Scale in the link is adopted into the shared Scale preference, so a link
 * opens in the Scale it was copied in and the reader's later screens follow it.
 */
export function useAnalysisViewUrl(today: MisCivilDate, offered: OfferedPlaces) {
  const { search, hash } = useLocation();
  const navigate = useNavigate();
  const { preference, setPreference } = useScalePreference();
  const [opened] = useState(() => parseAnalysisView(search, { today, offered }));
  const [filters, setFilters] = useState<MisAnalysisFilters>(opened.filters);
  const [linkScalePending, setLinkScalePending] = useState(opened.scale !== undefined);

  useEffect(() => {
    if (opened.scale !== undefined) setPreference(opened.scale);
  }, [opened.scale, setPreference]);

  // Until the preference has taken the link's Scale, the link's Scale is the
  // one written back; otherwise the first write would drop it.
  if (linkScalePending && preference === opened.scale) setLinkScalePending(false);

  const scale = linkScalePending && opened.scale ? opened.scale : preference;
  const written = serializeAnalysisView(filters, { scale, today });

  useEffect(() => {
    if (written === search.replace(/^\?/, "")) return;
    navigate({ search: written ? `?${written}` : "", hash }, { replace: true });
  }, [written, search, hash, navigate]);

  return { filters, setFilters };
}
