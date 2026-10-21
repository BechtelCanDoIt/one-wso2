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

// What the two breakdowns above the account table are made of, as data.

import type { AnalysisAccountRow } from "./analysisAccountRows";

export const OTHER_ENTITY = "Other";
export const UNSPECIFIED_ENTITY = "Unspecified";

/** How many entities keep a name and a hue of their own. */
const NAMED_ENTITY_COUNT = 5;

type EntityAccount = Pick<AnalysisAccountRow, "salesRegion" | "subRegion" | "totalArr">;

export interface RegionEntity {
  name: string;
  /** Position by total ARR, which picks the hue. `null` for Other, which has none. */
  rank: number | null;
}

export interface RegionEntities {
  label: "Region" | "Sub Region";
  /** The named entities from largest to smallest, then Other when any were folded. */
  order: RegionEntity[];
  /** The name of the entity an account is counted under, Other once it is folded. */
  bucketOf: (account: EntityAccount) => string;
}

/**
 * The geography the Portfolio charts cut ARR by.
 *
 * A region filter leaves only that region's accounts, so cutting by region
 * would draw one slice; the cut drops to sub-regions instead. Ranking is on the
 * rows given, so each entity's hue follows its standing in the filtered view.
 */
export function analysisRegionEntities(
  accounts: readonly EntityAccount[],
  { bySubRegion }: { bySubRegion: boolean },
): RegionEntities {
  const nameOf = (account: EntityAccount) =>
    (bySubRegion ? account.subRegion : account.salesRegion).trim() || UNSPECIFIED_ENTITY;

  const totals = new Map<string, number>();
  for (const account of accounts) {
    const name = nameOf(account);
    totals.set(name, (totals.get(name) ?? 0) + account.totalArr);
  }

  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  const named: RegionEntity[] = ranked
    .slice(0, NAMED_ENTITY_COUNT)
    .map((name, rank) => ({ name, rank }));
  const folded = new Set(ranked.slice(NAMED_ENTITY_COUNT));

  return {
    label: bySubRegion ? "Sub Region" : "Region",
    order: folded.size > 0 ? [...named, { name: OTHER_ENTITY, rank: null }] : named,
    bucketOf: (account) => {
      const name = nameOf(account);
      return folded.has(name) ? OTHER_ENTITY : name;
    },
  };
}
