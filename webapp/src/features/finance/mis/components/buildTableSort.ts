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

// Sorting a Build table's rows, with no DOM in it.
//
// The table asks its page for the rows, so the page sorts them once and hands
// the same list to the table and to the export. That is what keeps the file in
// the order the reader is looking at.

import { useState } from "react";
import type { BuildRow } from "./buildTableModel";

export type BuildSortDirection = "desc" | "asc";

/** A sortable column: an identity column, or one figure under one Period. */
export type BuildSortColumn =
  | { kind: "lead"; key: string }
  | { kind: "figure"; groupKey: string; subKey: string };

export interface BuildSort {
  column: BuildSortColumn;
  direction: BuildSortDirection;
}

/** What a page reads off a row for a column. Nothing sorts as last. */
export type BuildSortValue = number | string | null | undefined;

export const sortsColumn = (sort: BuildSort | null, column: BuildSortColumn): boolean => {
  if (!sort) return false;
  const sorted = sort.column;
  if (sorted.kind === "lead" && column.kind === "lead") return sorted.key === column.key;
  if (sorted.kind === "figure" && column.kind === "figure") {
    return sorted.groupKey === column.groupKey && sorted.subKey === column.subKey;
  }
  return false;
};

/** Descending, then ascending, then off; another column starts at descending. */
export function nextSort(current: BuildSort | null, column: BuildSortColumn): BuildSort | null {
  if (!sortsColumn(current, column)) return { column, direction: "desc" };
  return current?.direction === "desc" ? { column, direction: "asc" } : null;
}

const isNothing = (value: BuildSortValue): value is null | undefined =>
  value === null || value === undefined || value === "";

const compareValues = (a: NonNullable<BuildSortValue>, b: NonNullable<BuildSortValue>): number => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
};

const holdsItsPlace = (row: BuildRow): boolean => Boolean(row.emphasis) || (row.children?.length ?? 0) > 0;

/**
 * The rows in the sorted order.
 *
 * A bold row and a section hold their place, and the rows between two of them
 * sort among themselves. So a Build keeps its sections in order and its
 * Opening and Ending where they are, and a Customers table keeps its Total on
 * top of the book it adds up. A row with nothing to sort on goes last either
 * way, and rows that tie keep the order they came in.
 */
export function sortRows(
  rows: readonly BuildRow[],
  sort: BuildSort | null,
  valueOf: (row: BuildRow, column: BuildSortColumn) => BuildSortValue,
): readonly BuildRow[] {
  if (!sort) return rows;
  const sign = sort.direction === "desc" ? -1 : 1;
  const compare = (a: BuildRow, b: BuildRow): number => {
    const left = valueOf(a, sort.column);
    const right = valueOf(b, sort.column);
    if (isNothing(left)) return isNothing(right) ? 0 : 1;
    if (isNothing(right)) return -1;
    return sign * compareValues(left, right);
  };

  const out: BuildRow[] = [];
  let run: BuildRow[] = [];
  const flush = (): void => {
    out.push(...[...run].sort(compare));
    run = [];
  };
  for (const row of rows) {
    if (!holdsItsPlace(row)) {
      run.push(row);
      continue;
    }
    flush();
    out.push(row.children ? { ...row, children: sortRows(row.children, sort, valueOf) } : row);
  }
  flush();
  return out;
}

/**
 * A table's sort, which a change of `resetKey` puts back to unsorted.
 *
 * The key is whatever the page says makes this a different view of the table:
 * its Period and its applied filters. The Table is not in it because each
 * Table is its own component, so switching Table drops the state with it.
 */
export function useBuildSort(resetKey: unknown): {
  sort: BuildSort | null;
  toggle: (column: BuildSortColumn) => void;
} {
  const [state, setState] = useState<{ key: unknown; sort: BuildSort | null }>({ key: resetKey, sort: null });
  const sort = Object.is(state.key, resetKey) ? state.sort : null;
  const toggle = (column: BuildSortColumn): void =>
    setState({ key: resetKey, sort: nextSort(sort, column) });
  return { sort, toggle };
}
