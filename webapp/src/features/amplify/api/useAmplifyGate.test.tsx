// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { HttpError } from "@api/http";
import type { AmplifyMe, AmplifyRole } from "./amplifyTypes";

// The gate's query is replaced with a controllable result, so each state of
// /me (pending, answered, failed, 403, background failure) can be set directly.
const query: {
  data?: AmplifyMe;
  isPending: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: unknown;
  refetch: ReturnType<typeof vi.fn>;
} = { isPending: true, isLoading: true, isSuccess: false, isError: false, error: null, refetch: vi.fn() };

const backend = { configured: true };

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQuery: () => query,
}));
vi.mock("@asgardeo/react", () => ({ useAsgardeo: () => ({ isSignedIn: true }) }));
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
vi.mock("@hooks/useAsgardeoSub", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@hooks/useAsgardeoSub")>()),
  useAsgardeoSub: () => ({ state: { status: "ready", sub: "sub-1" }, retry: () => {} }),
}));
vi.mock("@config/apiConfig", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@config/apiConfig")>()),
  isAmplifyBackendConfigured: () => backend.configured,
}));

const { useAmplifyGate, amplifyVisibility } = await import("./useAmplifyGate");
const gate = () => renderHook(() => useAmplifyGate()).result.current;

const me = (roles: AmplifyRole[]): AmplifyMe => ({
  employee: { employee_id: "e1", email: "a@wso2.com", display_name: "A" },
  roles,
  capabilities: [],
  linkedin: { status: "ACTIVE" },
});

function answered(roles: AmplifyRole[]) {
  Object.assign(query, { data: me(roles), isPending: false, isLoading: false, isSuccess: true, isError: false, error: null });
}

function failed(error: unknown, data?: AmplifyMe) {
  Object.assign(query, { data, isPending: false, isLoading: false, isSuccess: false, isError: true, error });
}

const ROWS = [
  "sec-app-amplify",
  "amplify-posts",
  "amplify-leaderboard",
  "amplify-my-campaign",
  "amplify-team",
  "amplify-campaigns",
  "amplify-po-review",
  "amplify-reports",
  "amplify-admin",
] as const;

const visible = () => ROWS.filter((id) => gate().canSee(id));

beforeEach(() => {
  Object.assign(query, { data: undefined, isPending: true, isLoading: true, isSuccess: false, isError: false, error: null });
  query.refetch.mockReset();
  backend.configured = true;
});

describe("useAmplifyGate fails closed", () => {
  it("shows nothing while /me is resolving", () => {
    const g = gate();
    expect(g.isResolving).toBe(true);
    expect(g.isAuthorized).toBe(false);
    expect(visible()).toEqual([]);
  });

  it("shows nothing, and is not resolving, when the backend is not configured", () => {
    backend.configured = false;
    answered(["amplify_admin"]);
    const g = gate();
    expect(g.isResolving).toBe(false);
    expect(g.isAuthorized).toBe(false);
    expect(visible()).toEqual([]);
  });

  it("never opens an unknown id", () => {
    answered(["amplify_po", "amplify_marketing", "amplify_slt", "amplify_admin"]);
    expect(gate().canSee("amplify-something-new")).toBe(false);
  });

  it("treats a 403 from /me as hidden, not as a landing error", () => {
    failed(new HttpError("u/me", 403, JSON.stringify({ code: "ROLE_NOT_PERMITTED" })));
    const g = gate();
    expect(g.isError).toBe(false);
    expect(g.isAuthorized).toBe(false);
    expect(visible()).toEqual([]);
    expect(amplifyVisibility(g).error).toBeUndefined();
  });

  it("a 403 wins over cached roles", () => {
    failed(new HttpError("u/me", 403, "{}"), me(["amplify_admin"]));
    const g = gate();
    expect(g.isAuthorized).toBe(false);
    expect(g.isAdmin).toBe(false);
  });

  it("reports any other failure as a retryable error and still shows nothing", () => {
    failed(new HttpError("u/me", 503, "{}"));
    const g = gate();
    expect(g.isError).toBe(true);
    expect(g.errorMessage).toMatch(/503/);
    expect(visible()).toEqual([]);
    expect(amplifyVisibility(g).error).toBeTruthy();
    g.retry();
    expect(query.refetch).toHaveBeenCalledOnce();
  });

  it("keeps the last good roles through a failing background refetch", () => {
    failed(new HttpError("u/me", 503, "{}"), me(["amplify_po"]));
    const g = gate();
    expect(g.isError).toBe(false);
    expect(g.isAuthorized).toBe(true);
    expect(g.canSee("amplify-po-review")).toBe(true);
  });
});

describe("the per-item canSee matrix", () => {
  const everyday = ["sec-app-amplify", "amplify-posts", "amplify-leaderboard", "amplify-my-campaign", "amplify-team"];

  it.each<[string, AmplifyRole[], string[]]>([
    ["an employee with no Amplify role", [], everyday],
    ["marketing", ["amplify_marketing"], [...everyday, "amplify-campaigns"]],
    ["PO (campaigns too, A6)", ["amplify_po"], [...everyday, "amplify-campaigns", "amplify-po-review"]],
    ["SLT", ["amplify_slt"], [...everyday, "amplify-reports"]],
    // ADM is its own column, not a superset of PO/MKT.
    ["admin", ["amplify_admin"], [...everyday, "amplify-admin"]],
  ])("%s", (_label, roles, expected) => {
    answered(roles);
    expect(visible()).toEqual(expected);
  });
});
