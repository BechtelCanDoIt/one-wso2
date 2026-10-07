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

import type { ReactNode } from "react";

/**
 * The ARR Dashboard's chrome, settled by the prototype on `prototype/mis-look`.
 *
 * Finance chose the faithful reproduction of the standalone (ADR 0003). The
 * prototype carried two other chromes behind a switcher; this module keeps
 * only the one that won, so a component still asks `useMisLook()` and there is
 * nothing left to switch.
 */
export interface MisLook {
  periodControl: "segments" | "toggle";
  tableTabs: "underline" | "oxygen";
  unitPills: "pills" | "toggle";
  filterCard: "gradient" | "outlined";
  filterButtons: "faithful" | "oxygen";
  gridHeader: "brand" | "oxygen";
  gridSurface: "faithful" | "oxygen";
  /** Dead CSS in the standalone. Always off. See ADR 0003. */
  grandTotalGradient: boolean;
}

export const FAITHFUL_LOOK: MisLook = {
  periodControl: "segments",
  tableTabs: "underline",
  unitPills: "pills",
  filterCard: "gradient",
  filterButtons: "faithful",
  gridHeader: "brand",
  gridSurface: "faithful",
  grandTotalGradient: false,
};

/** The settled chrome. Named as a hook because every caller already calls it as one. */
export const useMisLook = (): MisLook => FAITHFUL_LOOK;

/** Kept so the page's existing wrap stays valid. It no longer switches anything. */
export function MisLookPrototypeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
