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

// Filtering a Build table's rows by the text in its identity columns, with no
// DOM in it. Like the sort, the page filters once and hands the same rows to
// the table and to the export.

import type { BuildRow } from "./buildTableModel";
import { useStateUntilKeyChanges } from "./useStateUntilKeyChanges";

/** The text each filtered identity column must contain, by column key. */
export type BuildFilters = Readonly<Record<string, string>>;

const NO_FILTERS: BuildFilters = {};

const needleOf = (filters: BuildFilters, key: string): string => (filters[key] ?? "").trim().toLowerCase();

export const filterIsOn = (filters: BuildFilters, key: string): boolean => needleOf(filters, key) !== "";

/**
 * The rows whose text contains every filter, in any case. A bold row stays
 * whatever it says: it is the Total, and it is the table's to re-add.
 */
export function filterRows(
  rows: readonly BuildRow[],
  filters: BuildFilters,
  textOf: (row: BuildRow, key: string) => string,
): readonly BuildRow[] {
  const keys = Object.keys(filters).filter((key) => filterIsOn(filters, key));
  if (!keys.length) return rows;
  return rows.filter(
    (row) => row.emphasis || keys.every((key) => textOf(row, key).toLowerCase().includes(needleOf(filters, key))),
  );
}

/** A table's filters, which a change of `resetKey` clears. See `useBuildSort`. */
export function useBuildFilters(resetKey: unknown): {
  filters: BuildFilters;
  setFilter: (key: string, text: string) => void;
} {
  const [filters, setFilters] = useStateUntilKeyChanges<BuildFilters>(resetKey, NO_FILTERS);
  return { filters, setFilter: (key, text) => setFilters({ ...filters, [key]: text }) };
}
