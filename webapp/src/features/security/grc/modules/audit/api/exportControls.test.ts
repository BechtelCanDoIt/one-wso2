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

import { describe, expect, it, vi } from "vitest";
import { bytesOf } from "@/test/downloads";
import { exportControls } from "@features/security/grc/modules/audit/api/exportControls";

vi.mock("@features/security/grc/shim/apiConfig", () => ({ BACKEND_BASE_URL: "http://backend.test" }));

const query = (s: string) => new URLSearchParams(s);

describe("exportControls", () => {
  it("asks for the audit's export with the view's query and returns the file", async () => {
    const csv = "﻿Control No.\nCA-01\n";
    const authFetch = vi.fn().mockResolvedValue(
      new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=audit-controls-hipaa-2026-10-28.csv",
        },
      }),
    );

    const { blob, fileName } = await exportControls(authFetch, 13, query("tab=overdue"));

    expect(authFetch).toHaveBeenCalledWith("http://backend.test/api/v1/audits/13/controls/export?tab=overdue");
    expect(fileName).toBe("audit-controls-hipaa-2026-10-28.csv");
    expect(Array.from(new Uint8Array(await bytesOf(blob)))).toEqual(Array.from(new TextEncoder().encode(csv)));
  });

  it("reads a quoted filename", async () => {
    const authFetch = vi.fn().mockResolvedValue(
      new Response("x", { headers: { "Content-Disposition": 'attachment; filename="a b.csv"' } }),
    );
    expect((await exportControls(authFetch, 1, query(""))).fileName).toBe("a b.csv");
  });

  it("falls back to a dated name when the server sends none", async () => {
    const authFetch = vi.fn().mockResolvedValue(new Response("x"));
    expect((await exportControls(authFetch, 1, query(""))).fileName).toMatch(/^audit-controls-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("throws the server's message when the export is refused", async () => {
    const authFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message: "too many controls" }), { status: 422 }));
    await expect(exportControls(authFetch, 1, query(""))).rejects.toThrow("too many controls");
  });

  it("falls back to the status when the error has no body", async () => {
    const authFetch = vi.fn().mockResolvedValue(new Response("", { status: 500 }));
    await expect(exportControls(authFetch, 1, query(""))).rejects.toThrow("Failed to export controls (500)");
  });
});
