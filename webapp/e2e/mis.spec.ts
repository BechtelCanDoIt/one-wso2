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

import { readFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * One signed-in walk of every Finance MIS section in Chromium.
 *
 * The session lives in e2e/.auth, which is gitignored: it is this browser's
 * Asgardeo storage, not a credential checked in. Without that file the walk
 * stops at sign-in.
 */

const AUTH_PATH = path.join(process.cwd(), "e2e/.auth/browser-storage.json");

const PERIODS = [
  { name: "Annually", path: "/finance/mis/arr-build" },
  { name: "Quarterly", path: "/finance/mis/qrr-build" },
  { name: "Monthly", path: "/finance/mis/mrr-build" },
] as const;

/** The seven Table tabs. Subscription is the table behind the four Build tabs. */
const TABLE_TABS = [
  "BU Build",
  "Software Build",
  "Cloud Build",
  "Custom Build",
  "Customers",
  "Region Summary",
  "BU Summary",
] as const;

const UNITS: Record<string, readonly string[]> = {
  "BU Build": ["API Platform", "IAM", "Integration", "Choreo", "Agent Platform", "All"],
  "Software Build": ["API Platform Software", "IAM Software", "Integration Software", "All Software"],
  "Cloud Build": [
    "API Platform Private Cloud + Bjira",
    "IAM Private Cloud + Asgardeo",
    "Integration Private Cloud + Devant",
    "Choreo",
    "Agent Platform",
    "Moesif",
    "All Cloud",
  ],
};

type Stored = { local: Record<string, string>; session: Record<string, string> };

function loadAuth(): Stored {
  try {
    return JSON.parse(readFileSync(AUTH_PATH, "utf8")) as Stored;
  } catch {
    throw new Error(
      "Missing e2e/.auth/browser-storage.json. Capture the signed-in localhost:3000 storage before this walk.",
    );
  }
}

function track(page: Page, problems: string[]) {
  const seen = new Set<string>();
  const note = (kind: string, detail: string) => {
    const line = `${kind}: ${detail}`;
    if (seen.has(line)) return;
    seen.add(line);
    problems.push(line);
  };

  page.on("pageerror", (error) => note("pageerror", error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // Chrome prints this for any failed response. The response listener below
    // is the one that names the URL, so this echo is not a second defect.
    if (/favicon|Download the React DevTools|\[vite\]|Failed to load resource: the server responded with a status of 403/i.test(text)) {
      return;
    }
    note("console", text.slice(0, 300));
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    let url: URL;
    try {
      url = new URL(response.url());
    } catch {
      return;
    }
    if (url.pathname.endsWith(".map")) return;
    // A 403 from OPD /user-info is the backend saying this person holds no OPD
    // role. useOpdUserInfo folds that into an empty role list on purpose.
    if (response.status() === 403 && url.pathname.endsWith("/opd-claims-backend/v1.0/user-info")) {
      return;
    }
    note("http", `${response.status()} ${url.origin}${url.pathname}`);
  });

  return note;
}

async function settle(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/checking your mis access/i)).toHaveCount(0);
  await expect(page.getByText(/checking whether arr analysis is available/i)).toHaveCount(0);
}

async function axe(page: Page, where: string, note: (kind: string, detail: string) => void) {
  const results = await new AxeBuilder({ page }).include('[data-testid="app-main"]').analyze();
  for (const violation of results.violations) {
    const target = violation.nodes[0]?.target?.join(" ") ?? "";
    note("axe", `${where} ${violation.id} (${violation.impact}) ${target}`);
  }
}

async function press(scope: Page | Locator, name: string) {
  const button = scope.getByRole("button", { name, exact: true });
  if ((await button.getAttribute("aria-pressed")) !== "true") await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

test("walks every MIS section", async ({ page }) => {
  const stored = loadAuth();
  const problems: string[] = [];
  const note = track(page, problems);

  await page.addInitScript((data: Stored) => {
    if (location.hostname !== "localhost") return;
    for (const [key, value] of Object.entries(data.local)) localStorage.setItem(key, value);
    for (const [key, value] of Object.entries(data.session)) sessionStorage.setItem(key, value);
  }, stored);

  for (const period of PERIODS) {
    await page.goto(period.path);
    await settle(page);
    await expect(page.getByRole("heading", { name: "ARR Dashboard" })).toBeVisible();
    await press(page.getByRole("main"), period.name);

    const tables = page.getByRole("group", { name: "Table" });
    for (const tab of TABLE_TABS) {
      await press(tables, tab);
      if (tab === "Region Summary") {
        await press(page.getByRole("main"), "All ARR Metrics");
        await axe(page, `${period.name} ${tab} all metrics`, note);
        await press(page.getByRole("main"), "Exit ARR");
      }
      const pills = UNITS[tab];
      if (pills) {
        const units = page.getByRole("group", { name: "Unit" });
        for (const pill of pills) await press(units, pill);
      }
      await axe(page, `${period.name} ${tab}`, note);
    }
  }

  await page.goto("/finance/mis/arr-build");
  await settle(page);
  await press(page.getByRole("main"), "TTM");
  await axe(page, "annually TTM", note);

  await page.goto("/finance/mis/analysis");
  await settle(page);
  await expect(page.getByRole("heading", { name: "ARR Analysis" })).toBeVisible();
  await expect(page.getByText("ARR by partner model")).toBeVisible();
  await axe(page, "ARR Analysis", note);

  const search = page.locator('[class*="toolbarQuickFilterTrigger"]');
  if (await search.count()) {
    await search.click();
    await expect(page.locator('[class*="toolbarQuickFilterControl"] input')).toHaveAttribute(
      "aria-label",
      "Search",
    );
    await axe(page, "ARR Analysis search", note);
  }

  expect(problems, problems.join("\n")).toEqual([]);
});
