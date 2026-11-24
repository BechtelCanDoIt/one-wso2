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

import { useCallback, useMemo } from "react";
import { localIsoDate } from "@utils/localDate";
import { useListView } from "../../model/useListView";
import { drillPatch, patchCostView, readCostView, type CostView, type CostViewPatch, type FilterKey } from "./costView";

/** The Travel Costs controls bar's state, bound to the address bar. Writes keep every key it does not own (Allocations Today's date and business unit). */
export function useTravelCostView(): {
  readonly view: CostView;
  readonly set: (patch: CostViewPatch) => void;
  readonly drill: (key: FilterKey, value: string) => void;
} {
  const list = useListView();
  const today = localIsoDate();
  const { filters, setFilters } = list;
  const view = useMemo(() => readCostView(filters, today), [filters, today]);
  const set = useCallback((patch: CostViewPatch) => setFilters(patchCostView(filters, patch)), [filters, setFilters]);
  const drill = useCallback((key: FilterKey, value: string) => set(drillPatch(key, value)), [set]);
  return { view, set, drill };
}
