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
import { fireEvent, render, screen } from "@testing-library/react";

const mutate = vi.fn();
vi.mock("../api/useAmplifyMutations", () => ({ useRequestShare: () => ({ mutate, isPending: false }) }));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

import ShareDialog from "./ShareDialog";
import type { Campaign } from "../api/amplifyTypes";

describe("ShareDialog", () => {
  it("asks for a REPOST of the post, not a new post that links to it", () => {
    render(<ShareDialog campaign={{ id: "c-1", title: "WSO2 Integrator 5.0 is here" } as Campaign} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Amplify" }));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ campaignId: "c-1", kind: "REPOST" });
  });
});
