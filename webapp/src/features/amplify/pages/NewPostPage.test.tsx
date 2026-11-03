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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mutate = vi.fn();
vi.mock("../api/useAmplifyMutations", () => ({ useRegisterCampaign: () => ({ mutate, isPending: false }) }));
vi.mock("../api/useAmplifyData", () => ({
  useAmplifyCategories: () => ({ data: [{ code: "PRODUCT", label: "Product" }] }),
  useAmplifyConfig: () => ({
    linkedinOrgUrn: "urn:li:organization:1",
    postLinkOrigins: ["https://www.linkedin.com", "https://linkedin.com"],
  }),
}));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));
vi.mock("react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../components/AmplifyShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AmplifyPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../components/CategoryPicker", () => ({ default: () => <div /> }));

import NewPostPage from "./NewPostPage";

describe("NewPostPage post type", () => {
  beforeEach(() => mutate.mockClear());

  const fill = (url: string) => {
    fireEvent.change(screen.getByLabelText(/Post URL/), { target: { value: url } });
    fireEvent.change(screen.getByLabelText(/Headline/), { target: { value: "Hello" } });
  };
  const save = () => fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

  it("registers a share by default and follows the kind in the placeholder", () => {
    render(<NewPostPage />);
    expect(screen.getByPlaceholderText(/urn:li:share:/)).toBeTruthy();
    fill("https://www.linkedin.com/feed/update/urn:li:share:7123/");
    save();
    expect(mutate.mock.calls[0][0].draft.resourceUrn).toBe("urn:li:share:7123");
  });

  it("syncs the list to a pasted ugcPost and registers it as ugcPost", () => {
    render(<NewPostPage />);
    fill("https://www.linkedin.com/feed/update/urn:li:ugcPost:7123/");
    expect(screen.getByPlaceholderText(/urn:li:ugcPost:/)).toBeTruthy();
    save();
    const draft = mutate.mock.calls[0][0].draft;
    expect(draft.resourceUrn).toBe("urn:li:ugcPost:7123");
    expect(draft.resourceUrl).toBe("https://www.linkedin.com/feed/update/urn:li:ugcPost:7123/");
  });

  it("does not register an activity link", () => {
    render(<NewPostPage />);
    fill("https://www.linkedin.com/feed/update/urn:li:activity:7123/");
    save();
    expect(mutate).not.toHaveBeenCalled();
  });
});
