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

import { describe, expect, it } from "vitest";
import type { BuildRow } from "./buildTableModel";
import {
  nextSort,
  sortRows,
  sortsColumn,
  type BuildSort,
  type BuildSortColumn,
  type BuildSortValue,
} from "./buildTableSort";

const AMOUNT: BuildSortColumn = { kind: "figure", groupKey: "2025", subKey: "amount" };
const NAME: BuildSortColumn = { kind: "lead", key: "__label" };

const ids = (rows: readonly BuildRow[]): string[] => rows.map((row) => row.id);

/** A figure per row id, read the way a page reads its raw figure. */
const valuesOf =
  (figures: Record<string, BuildSortValue>) =>
  (row: BuildRow): BuildSortValue =>
    figures[row.id];

describe("the sort cycle", () => {
  it("goes ascending, then descending, then off", () => {
    const first = nextSort(null, AMOUNT);
    expect(first).toEqual({ column: AMOUNT, direction: "asc" });
    const second = nextSort(first, AMOUNT);
    expect(second).toEqual({ column: AMOUNT, direction: "desc" });
    expect(nextSort(second, AMOUNT)).toBeNull();
  });

  it("starts another column over at ascending", () => {
    const sorted: BuildSort = { column: AMOUNT, direction: "desc" };
    expect(nextSort(sorted, NAME)).toEqual({ column: NAME, direction: "asc" });
  });

  it("tells one column from another by its Period as well as its sub-column", () => {
    const other: BuildSortColumn = { kind: "figure", groupKey: "2024", subKey: "amount" };
    expect(sortsColumn({ column: AMOUNT, direction: "desc" }, AMOUNT)).toBe(true);
    expect(sortsColumn({ column: AMOUNT, direction: "desc" }, other)).toBe(false);
    expect(sortsColumn(null, AMOUNT)).toBe(false);
  });
});

describe("sorting rows", () => {
  const FLAT: readonly BuildRow[] = [
    { id: "a", label: "Alpha" },
    { id: "b", label: "bravo" },
    { id: "c", label: "Charlie" },
  ];

  it("leaves the rows alone when nothing is sorted", () => {
    expect(sortRows(FLAT, null, valuesOf({}))).toBe(FLAT);
  });

  it("orders by figure, largest first when descending", () => {
    const figures = { a: 10, b: 30, c: 20 };
    expect(ids(sortRows(FLAT, { column: AMOUNT, direction: "desc" }, valuesOf(figures)))).toEqual(["b", "c", "a"]);
    expect(ids(sortRows(FLAT, { column: AMOUNT, direction: "asc" }, valuesOf(figures)))).toEqual(["a", "c", "b"]);
  });

  it("orders text without regard to case, and digits as numbers", () => {
    const rows: readonly BuildRow[] = [
      { id: "1", label: "" },
      { id: "2", label: "" },
      { id: "3", label: "" },
      { id: "4", label: "" },
    ];
    const names = { "1": "acme 10", "2": "Acme 9", "3": "Zeta", "4": "beta" };
    expect(ids(sortRows(rows, { column: NAME, direction: "asc" }, valuesOf(names)))).toEqual(["2", "1", "4", "3"]);
  });

  it("puts a row with no figure last in either direction", () => {
    const figures = { a: 10, b: undefined, c: 20 };
    expect(ids(sortRows(FLAT, { column: AMOUNT, direction: "desc" }, valuesOf(figures)))).toEqual(["c", "a", "b"]);
    expect(ids(sortRows(FLAT, { column: AMOUNT, direction: "asc" }, valuesOf(figures)))).toEqual(["a", "c", "b"]);
  });

  it("keeps rows that tie in the order they came", () => {
    const figures = { a: 5, b: 5, c: 5 };
    expect(ids(sortRows(FLAT, { column: AMOUNT, direction: "desc" }, valuesOf(figures)))).toEqual(["a", "b", "c"]);
  });

  it("does not change the rows it was given", () => {
    const before = ids(FLAT);
    sortRows(FLAT, { column: AMOUNT, direction: "desc" }, valuesOf({ a: 1, b: 3, c: 2 }));
    expect(ids(FLAT)).toEqual(before);
  });
});

describe("what a sort holds in place", () => {
  const BUILD: readonly BuildRow[] = [
    {
      id: "movement",
      label: "ARR movement",
      children: [
        { id: "opening", label: "Opening", emphasis: true },
        { id: "new", label: "New" },
        { id: "expansions", label: "Expansions" },
        { id: "lost", label: "Lost" },
        { id: "ending", label: "Ending", emphasis: true },
        { id: "growth", label: "y/y" },
        { id: "net-new", label: "Net new" },
      ],
    },
    {
      id: "customers",
      label: "Customers",
      children: [
        { id: "c-open", label: "Opening customers" },
        { id: "c-new", label: "New customers" },
      ],
    },
  ];
  const figures = {
    opening: 100, new: 5, expansions: 9, lost: 1, ending: 120, growth: 3, "net-new": 7,
    "c-open": 1, "c-new": 2,
  };
  const desc: BuildSort = { column: AMOUNT, direction: "desc" };

  it("keeps the sections in their order and sorts inside each one", () => {
    const sorted = sortRows(BUILD, desc, valuesOf(figures));
    expect(ids(sorted)).toEqual(["movement", "customers"]);
    expect(ids(sorted[1].children ?? [])).toEqual(["c-new", "c-open"]);
  });

  it("keeps the bold reconciliation rows where they are", () => {
    const children = sortRows(BUILD, desc, valuesOf(figures))[0].children ?? [];
    expect(children[0].id).toBe("opening");
    expect(children[4].id).toBe("ending");
  });

  it("reorders only between the bold rows, never across one", () => {
    const children = sortRows(BUILD, desc, valuesOf(figures))[0].children ?? [];
    expect(ids(children.slice(1, 4))).toEqual(["expansions", "new", "lost"]);
    expect(ids(children.slice(5))).toEqual(["net-new", "growth"]);
  });

  it("keeps a Total pinned on top of a flat book while the book sorts", () => {
    const book: readonly BuildRow[] = [
      { id: "total", label: "Total", emphasis: true },
      { id: "x", label: "X" },
      { id: "y", label: "Y" },
      { id: "z", label: "Z" },
    ];
    const sorted = sortRows(book, desc, valuesOf({ total: 6, x: 1, y: 3, z: 2 }));
    expect(ids(sorted)).toEqual(["total", "y", "z", "x"]);
  });
});
