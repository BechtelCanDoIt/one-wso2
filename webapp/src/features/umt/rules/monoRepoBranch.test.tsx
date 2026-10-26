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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

// The Branch tab can ask for a component branch of a mono repo, cut from the
// directory of one component. The real branch hooks run: only the HTTP helpers
// are stubbed.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UmtUpdateSummary } from "../api/umtUpdates";

vi.mock("@asgardeo/react", () => ({ useAsgardeo: () => ({ isSignedIn: true }) }));
vi.mock("@hooks/useAsgardeoSub", () => ({
  useAsgardeoSub: () => ({ state: { status: "ready", sub: "user-under-test" }, retry: () => {} }),
  foldIdentityError: (query: unknown) => query,
}));
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));

const notify = vi.hoisted(() => ({ showSuccess: vi.fn(), showError: vi.fn() }));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ ...notify, showWarning: vi.fn() }),
}));

const authedGet = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => []);
const authedPost = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null);
vi.mock("@api/http", async () => {
  const actual = await vi.importActual<typeof import("@api/http")>("@api/http");
  return {
    ...actual,
    authedGet: (...args: unknown[]) => authedGet(...args),
    authedPost: (...args: unknown[]) => authedPost(...args),
  };
});

// `@config/apiConfig` reads `window.config` at module load.
(window as unknown as { config: Record<string, string> }).config = {
  ONE_WSO2_UMT_BACKEND_URL: "https://umt.example.com",
};

const { default: UmtUpdateBranchTab } = await import("../components/UmtUpdateBranchTab");
const { umtServiceUrls } = await import("@config/apiConfig");

const PUBLIC_REPO = "https://github.com/wso2/carbon-identity-framework";

function renderTab(overrides: Partial<UmtUpdateSummary> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const update = {
    id: 42,
    isHotfix: false,
    products: [
      {
        productId: 1,
        type: "CompatibleInitial",
        product: { id: 1, name: "wso2am", version: "4.2.0.full" },
      },
    ],
    ...overrides,
  } as unknown as UmtUpdateSummary;
  render(
    <QueryClientProvider client={client}>
      <UmtUpdateBranchTab id="42" products={{}} update={update} />
    </QueryClientProvider>,
  );
}

type User = ReturnType<typeof userEvent.setup>;

// Pasting is one input event, where typing re-renders the whole tab once per
// character.
async function enter(user: User, field: HTMLElement, text: string) {
  await user.click(field);
  await user.paste(text);
}

// A required field's label ends in an asterisk, so match on how it begins.
const repoField = () => screen.getByLabelText(/^Public Repository URL/);
const releaseField = () => screen.getByLabelText(/^Release Version/);

async function fillRepoAndTag(user: User) {
  await enter(user, repoField(), PUBLIC_REPO);
  await enter(user, releaseField(), "5.25.100");
}

const directoryField = () => screen.queryByLabelText(/^Component Directory Path/);
const createButton = () => screen.getByRole("button", { name: "Create Branch" });

beforeEach(() => {
  authedGet.mockClear();
  authedPost.mockClear();
  notify.showSuccess.mockClear();
  notify.showError.mockClear();
});

describe("Creating a component branch of a mono repo", () => {
  it("asks for the component directory only once the repository is marked as a mono repo", async () => {
    const user = userEvent.setup();
    renderTab();

    expect(directoryField()).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Mono repo"));
    expect(directoryField()).toBeInTheDocument();

    await user.click(screen.getByLabelText("Mono repo"));
    expect(directoryField()).not.toBeInTheDocument();
  });

  it("marks the repository, release version and directory fields as required", async () => {
    const user = userEvent.setup();
    renderTab();

    expect(repoField()).toBeRequired();
    expect(releaseField()).toBeRequired();

    await user.click(screen.getByLabelText("Mono repo"));
    expect(directoryField()).toBeRequired();
  });

  it("sends the mono repo and its trimmed directory with an update's branch request", async () => {
    const user = userEvent.setup();
    renderTab();
    await fillRepoAndTag(user);
    await user.click(screen.getByLabelText("Mono repo"));
    await enter(user, directoryField()!, "  components/identity ");
    await user.click(createButton());

    await waitFor(() => expect(authedPost).toHaveBeenCalledTimes(1));
    const [url, , body] = authedPost.mock.calls[0];
    expect(url).toBe(umtServiceUrls.createUpdateBranch("42"));
    expect(body).toEqual({
      branchType: "ComponentBranch",
      channel: "full",
      productName: "wso2am",
      publicRepoUrl: PUBLIC_REPO,
      releaseTag: "5.25.100",
      isMonoRepo: true,
      componentDirPath: "components/identity",
    });
  });

  it("sends the mono repo and its directory with a hotfix's branch request", async () => {
    const user = userEvent.setup();
    renderTab({ isHotfix: true, jiraId: "PRODUCTAPIM-1", wso2CaseId: "" } as Partial<UmtUpdateSummary>);
    await fillRepoAndTag(user);
    await user.click(screen.getByLabelText("Mono repo"));
    await enter(user, directoryField()!, "components/identity");
    await user.click(createButton());

    await waitFor(() => expect(authedPost).toHaveBeenCalledTimes(1));
    const [url, , body] = authedPost.mock.calls[0];
    expect(url).toBe(umtServiceUrls.createHotfixBranch("42"));
    expect(body).toMatchObject({
      branchType: "ComponentBranch",
      jiraId: "PRODUCTAPIM-1",
      productVersion: "4.2.0.full",
      isMonoRepo: true,
      componentDirPath: "components/identity",
    });
  });

  it("refuses a mono repo request that names no directory", async () => {
    const user = userEvent.setup();
    renderTab();
    await fillRepoAndTag(user);
    await user.click(screen.getByLabelText("Mono repo"));
    await enter(user, directoryField()!, "   ");
    await user.click(createButton());

    expect(await screen.findByText("Component Directory Path is required")).toBeInTheDocument();
    expect(authedPost).not.toHaveBeenCalled();
  });

  it("sends neither field for a repository that holds one component, even after a directory was typed", async () => {
    const user = userEvent.setup();
    renderTab();
    await fillRepoAndTag(user);
    await user.click(screen.getByLabelText("Mono repo"));
    await enter(user, directoryField()!, "components/identity");
    await user.click(screen.getByLabelText("Mono repo"));
    await user.click(createButton());

    await waitFor(() => expect(authedPost).toHaveBeenCalledTimes(1));
    const body = authedPost.mock.calls[0][2] as Record<string, unknown>;
    expect(body.isMonoRepo).toBeUndefined();
    expect(body.componentDirPath).toBeUndefined();
  });

  it("clears the mono repo choice once the branch is requested", async () => {
    const user = userEvent.setup();
    renderTab();
    await fillRepoAndTag(user);
    await user.click(screen.getByLabelText("Mono repo"));
    await enter(user, directoryField()!, "components/identity");
    await user.click(createButton());

    await waitFor(() => expect(notify.showSuccess).toHaveBeenCalled());
    await waitFor(() => expect(directoryField()).not.toBeInTheDocument());
    expect(screen.getByLabelText("Mono repo")).not.toBeChecked();
  });
});
