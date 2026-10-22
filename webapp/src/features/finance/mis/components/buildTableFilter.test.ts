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
import { filterIsOn, filterRows } from "./buildTableFilter";

const ROWS: readonly BuildRow[] = [
  { id: "total", label: "Total", emphasis: true },
  { id: "a", label: "Northwind Bank" },
  { id: "b", label: "Contoso" },
  { id: "c", label: "North Star Ltd" },
];
const TEXT: Record<string, Record<string, string>> = {
  a: { name: "Northwind Bank", region: "EMEA" },
  b: { name: "Contoso", region: "APAC" },
  c: { name: "North Star Ltd", region: "AMER" },
};
const textOf = (row: BuildRow, key: string): string => TEXT[row.id]?.[key] ?? "";
const ids = (rows: readonly BuildRow[]) => rows.map((row) => row.id);

describe("filtering rows by what an identity column says", () => {
  it("leaves the rows alone when no filter is on", () => {
    expect(filterRows(ROWS, {}, textOf)).toBe(ROWS);
    expect(filterRows(ROWS, { name: "  " }, textOf)).toBe(ROWS);
  });

  it("keeps the rows whose text contains the filter, in any case", () => {
    expect(ids(filterRows(ROWS, { name: "NORTH" }, textOf))).toEqual(["total", "a", "c"]);
    expect(ids(filterRows(ROWS, { name: "wind b" }, textOf))).toEqual(["total", "a"]);
  });

  it("asks of every filtered column at once", () => {
    expect(ids(filterRows(ROWS, { name: "north", region: "emea" }, textOf))).toEqual(["total", "a"]);
  });

  it("keeps a bold row whatever it says", () => {
    expect(ids(filterRows(ROWS, { name: "zzz" }, textOf))).toEqual(["total"]);
  });

  it("does not take a filter's own spaces as part of what to find", () => {
    expect(ids(filterRows(ROWS, { name: " contoso " }, textOf))).toEqual(["total", "b"]);
  });

  it("knows whether a column is filtered", () => {
    expect(filterIsOn({ name: "x" }, "name")).toBe(true);
    expect(filterIsOn({ name: " " }, "name")).toBe(false);
    expect(filterIsOn({}, "name")).toBe(false);
  });
});
