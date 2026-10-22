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

// The Integration Tests step lists the Compatible Initial product first, then
// the other products in the order the update holds them.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UmtUpdateProduct, UmtUpdateSummary } from "../../../api/umtUpdates";

vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));
vi.mock("../../../api/useUmtIntegrationTests", () => ({
  useUmtSaveIntegrationTests: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

const { default: UmtIntegrationTestsStep } = await import("./UmtIntegrationTestsStep");

function product(productId: number, name: string, version: string, type: string): UmtUpdateProduct {
  return { productId, product: { name, version }, type };
}

function renderStep(products: UmtUpdateProduct[]) {
  render(<UmtIntegrationTestsStep id="42" update={{ id: 42, products } as UmtUpdateSummary} />);
}

// The product cards' headings, top to bottom.
const cardHeadings = () => screen.getAllByRole("heading", { level: 6 }).map((heading) => heading.textContent);

describe("product order on the Integration Tests step", () => {
  it("lists the Compatible Initial product first, and the others in their own order", () => {
    renderStep([
      product(1, "wso2si", "1.1.0.69.full", "Primary"),
      product(2, "wso2is", "7.0.0.135.full", "Compatible"),
      product(3, "wso2is", "6.1.0.258.full", "CompatibleInitial"),
    ]);

    expect(cardHeadings()).toEqual(["wso2is - 6.1.0.258.full", "wso2si - 1.1.0.69.full", "wso2is - 7.0.0.135.full"]);
  });

  it("keeps the order when the Compatible Initial product is already first", () => {
    renderStep([
      product(3, "wso2is", "6.1.0.258.full", "CompatibleInitial"),
      product(1, "wso2si", "1.1.0.69.full", "Primary"),
    ]);

    expect(cardHeadings()).toEqual(["wso2is - 6.1.0.258.full", "wso2si - 1.1.0.69.full"]);
  });

  it("keeps the order when no product is Compatible Initial", () => {
    renderStep([
      product(1, "wso2si", "1.1.0.69.full", "Primary"),
      product(2, "wso2is", "7.0.0.135.full", "Compatible"),
    ]);

    expect(cardHeadings()).toEqual(["wso2si - 1.1.0.69.full", "wso2is - 7.0.0.135.full"]);
  });
});
