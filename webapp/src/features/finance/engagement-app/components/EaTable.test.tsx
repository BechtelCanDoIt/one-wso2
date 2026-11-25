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

import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { nextSort } from "../model/sorting";
import EaTable from "./EaTable";

describe("EaTable rows", () => {
  it("opens a clickable row from the keyboard", () => {
    const open = vi.fn();
    render(
      <EaTable
        ariaLabel="Allocations"
        columns={[{ key: "name", label: "Name", render: (r: { id: string }) => r.id }]}
        rows={[{ id: "E00001" }]}
        rowKey={(r) => r.id}
        onRowClick={open}
        empty="No allocations"
      />,
    );
    const row = screen.getByText("E00001").closest("tr")!;
    expect(row.tabIndex).toBe(0);
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });
    expect(open).toHaveBeenCalledTimes(2);
  });
});

describe("EaTable sorting", () => {
  const columns = [
    { key: "name", label: "Name", sortKey: "name", render: (r: { id: string }) => r.id },
    { key: "other", label: "Other", render: () => "x" },
  ];

  function Sorted({ onSort }: { onSort?: (s: string) => void }) {
    const [sort, setSort] = useState("");
    return (
      <EaTable
        ariaLabel="Things"
        columns={columns}
        rows={[{ id: "A" }]}
        rowKey={(r) => r.id}
        sorting={{ sort, onSort: (s) => (setSort(s), onSort?.(s)) }}
        empty="None"
      />
    );
  }

  it("cycles ascending, descending, then the default order, and reports it in aria-sort", () => {
    const onSort = vi.fn();
    render(<Sorted onSort={onSort} />);
    const header = screen.getByRole("columnheader", { name: "Name" });
    expect(header).toHaveAttribute("aria-sort", "none");
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(onSort).toHaveBeenLastCalledWith("name");
    expect(header).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(onSort).toHaveBeenLastCalledWith("-name");
    expect(header).toHaveAttribute("aria-sort", "descending");
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(onSort).toHaveBeenLastCalledWith("");
    expect(header).toHaveAttribute("aria-sort", "none");
  });

  it("leaves columns without a sortKey as plain headers", () => {
    render(<Sorted />);
    expect(screen.getByRole("columnheader", { name: "Other" })).not.toHaveAttribute("aria-sort");
    expect(screen.queryByRole("button", { name: "Other" })).toBeNull();
  });

  it("keeps headers plain when the table has no sorting", () => {
    render(<EaTable ariaLabel="Things" columns={columns} rows={[]} rowKey={(r: { id: string }) => r.id} empty="None" />);
    expect(screen.queryByRole("button", { name: "Name" })).toBeNull();
  });

  it("moves from another column's sort straight to ascending", () => {
    expect(nextSort("-other", "name")).toBe("name");
  });
});
