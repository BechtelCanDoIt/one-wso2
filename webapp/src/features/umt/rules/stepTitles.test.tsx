// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

// The Edit tab's stepper already names the step the update is on, so a step
// does not repeat that name as a title of its own.

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UmtUpdateProduct, UmtUpdateSummary } from "../api/umtUpdates";

vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));
vi.mock("../api/useUmtTesting", () => ({
  UmtPartialTestingSaveError: class extends Error {},
  useUmtSaveTestingResults: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUmtStagingTestResults: () => ({
    isPending: false,
    isError: false,
    data: [{ productId: 1, productName: "wso2am", baseVersion: "4.2.0", automatedTestResult: "failure" }],
  }),
}));
vi.mock("../api/useUmtIntegrationTests", () => ({
  useUmtSaveIntegrationTests: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock("../api/useUmtSecurityAdvisory", () => ({
  useUmtSaveSecurityAdvisories: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUmtValidateSecurityAdvisory: () => ({ data: undefined, isError: false, isFetching: false, error: null }),
}));
vi.mock("../components/UmtUpdateDetailsGrid", () => ({ default: () => <div>Update details</div> }));
vi.mock("../components/UmtUpdateViewSections", () => ({ default: () => <div>Update sections</div> }));

// `@config/apiConfig` reads `window.config` at module load.
(window as unknown as { config: Record<string, string> }).config = {
  ONE_WSO2_UMT_BACKEND_URL: "https://umt.example.com",
};

const { default: UmtDescriptionInstructionStep } = await import(
  "../components/edit/description-instruction/UmtDescriptionInstructionStep"
);
const { default: UmtSecurityAdvisoryStep } = await import("../components/edit/security-advisory/UmtSecurityAdvisoryStep");
const { default: UmtIntegrationTestsStep } = await import("../components/edit/integration-tests/UmtIntegrationTestsStep");
const { default: UmtTestingStep } = await import("../components/edit/testing/UmtTestingStep");
const { default: UmtValidateStep } = await import("../components/edit/validate/UmtValidateStep");
const { default: UmtVerifyingStep } = await import("../components/edit/verifying/UmtVerifyingStep");

const PRODUCT: UmtUpdateProduct = { productId: 1, product: { name: "wso2am", version: "4.2.0" } };

function update(overrides: Partial<UmtUpdateSummary> = {}): UmtUpdateSummary {
  return { id: 42, lifecycleState: "ProductAnalyzed", products: [PRODUCT], ...overrides };
}

const STEPS: { label: string; step: ReactElement }[] = [
  { label: "Description and Instruction", step: <UmtDescriptionInstructionStep id="42" update={update()} /> },
  {
    label: "Description and Instruction",
    step: <UmtDescriptionInstructionStep id="42" update={update({ isHotfix: true })} />,
  },
  { label: "Security Advisory", step: <UmtSecurityAdvisoryStep id="42" update={update()} /> },
  { label: "Integration Tests", step: <UmtIntegrationTestsStep id="42" update={update()} /> },
  { label: "Testing", step: <UmtTestingStep id="42" update={update({ lifecycleState: "Staging" })} /> },
  { label: "Validate", step: <UmtValidateStep id="42" update={update({ lifecycleState: "Staging" })} /> },
  { label: "Verifying", step: <UmtVerifyingStep id="42" update={update({ lifecycleState: "UATStaging" })} /> },
];

describe("step titles on the Edit tab", () => {
  it.each(STEPS)("$label is not repeated as a title", ({ label, step }) => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(<QueryClientProvider client={client}>{step}</QueryClientProvider>);

    expect(screen.queryByRole("heading", { name: label })).not.toBeInTheDocument();
  });
});
