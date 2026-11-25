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
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BriefcaseIcon, ReceiptIcon, WalletIcon } from "@wso2/oxygen-ui-icons-react";

// Same seams as SideRail.groupFrame.test.tsx.
vi.mock("@features/security/grc/shim/useAuthApiClient", () => ({
  useAuthApiClient: () => vi.fn(),
}));
vi.mock("@context/perspective/PerspectiveContext", () => ({
  useActivePerspective: () => ({
    key: "finance",
    label: "Finance",
    icon: WalletIcon,
    path: "/finance",
    forwardsToFirstItem: true,
    sections: [
      {
        id: "sec-app-other",
        label: "Other App",
        icon: WalletIcon,
        alwaysGroup: true,
        children: [{ id: "other-long", label: "A Long Label That Would Not Fit", path: "/finance/other" }],
      },
      {
        id: "sec-app-engagement-app",
        label: "Engagement App",
        icon: BriefcaseIcon,
        alwaysGroup: true,
        children: [{ id: "ea-invoices", label: "Invoices & Payments", icon: ReceiptIcon, path: "/finance/engagement-app/invoices", wrapLabel: true }],
      },
    ],
  }),
}));
vi.mock("./usePerspectiveVisibility", () => ({
  usePerspectiveVisibility: () => ({ resolveVisible: () => true }),
}));

import SideRail from "./SideRail";

function renderSideRail(at: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[at]}>
        <SideRail collapsed={false} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const primary = (text: string) => screen.getByText(text).closest(".MuiListItemText-primary") ?? screen.getByText(text);

describe("SideRail nested labels", () => {
  it("keeps other apps' labels on one line with an ellipsis", () => {
    // A group opens around the current route.
    renderSideRail("/finance/other");
    const s = getComputedStyle(primary("A Long Label That Would Not Fit"));
    expect(s.whiteSpace).toBe("nowrap");
    expect(s.textOverflow).toBe("ellipsis");
  });

  it("lets a row that opts in wrap onto a second line", () => {
    renderSideRail("/finance/engagement-app/invoices");
    const s = getComputedStyle(primary("Invoices & Payments"));
    expect(s.whiteSpace).toBe("normal");
    expect(s.textOverflow).not.toBe("ellipsis");
  });
});
