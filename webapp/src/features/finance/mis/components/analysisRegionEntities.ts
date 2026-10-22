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

import { CHART_ENTITY_SERIES } from "@components/charts/chartPalette";
import type { AnalysisAccountRow } from "./analysisAccountRows";
import {
  ANALYSIS_INDUSTRIES,
  ANALYSIS_OTHER_INDUSTRY,
  type IndustryRow,
  type PartnerModelSlice,
} from "./analysisBreakdowns";

export const OTHER_ENTITY = "Other";
export const UNSPECIFIED_ENTITY = "Unspecified";

/** How many entities keep a name and a hue of their own. */
const NAMED_ENTITY_COUNT = CHART_ENTITY_SERIES.length;

type EntityAccount = Pick<AnalysisAccountRow, "salesRegion" | "subRegion" | "totalArr">;
type IndustryAccount = EntityAccount & Pick<AnalysisAccountRow, "industry">;
type PartnerAccount = EntityAccount & Pick<AnalysisAccountRow, "partnerType">;

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

export interface EntityArc extends RegionEntity {
  amount: number;
}

export interface PartnerModelEntities {
  model: PartnerModelSlice;
  entities: EntityArc[];
}

/**
 * What each partner model is made of, region entity by region entity.
 *
 * A model's total is the figure the exit-ARR read gave, not the sum of its
 * accounts; the accounts only supply the mix, which is spread over that total
 * so the outer ring covers exactly the arc of the inner slice it sits on.
 */
export function entitiesWithinPartnerModels(
  models: readonly PartnerModelSlice[],
  accounts: readonly PartnerAccount[],
  { order, bucketOf }: RegionEntities,
): PartnerModelEntities[] {
  const rankOf = new Map(order.map((entity) => [entity.name, entity.rank]));

  return models.map((model) => {
    const mix = new Map<string, number>();
    for (const account of accounts) {
      if (account.partnerType.trim().toLowerCase() !== model.id) continue;
      const name = bucketOf(account);
      mix.set(name, (mix.get(name) ?? 0) + account.totalArr);
    }
    const contributing = [...mix.entries()].filter(([, amount]) => amount > 0);
    const mixTotal = contributing.reduce((sum, [, amount]) => sum + amount, 0);

    if (contributing.length === 0) {
      return { model, entities: [{ name: UNSPECIFIED_ENTITY, rank: null, amount: model.amount }] };
    }
    return {
      model,
      entities: contributing
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({
          name,
          rank: rankOf.get(name) ?? null,
          amount: (amount / mixTotal) * model.amount,
        })),
    };
  });
}

export interface IndustryBar {
  industry: string;
  /** The industry's exit-ARR figure, which the stacks sum to. */
  amount: number;
  share?: number;
  /** Amount by entity name; an entity that contributes nothing has no key. */
  stacks: Record<string, number>;
}

export interface IndustryStacks {
  bars: IndustryBar[];
  /** The entities some bar draws, in rank order with Other last. */
  legend: RegionEntity[];
}

/**
 * Each industry's bar, split by region entity.
 *
 * A bar's height is the figure the exit-ARR read gave for that industry; the
 * accounts only supply the mix, spread over that figure. An industry no account
 * can account for goes to Other whole, so a bar never falls short of its real
 * height. An account outside the six named industries counts under Other.
 */
export function industryRegionStacks(
  industries: readonly IndustryRow[],
  accounts: readonly IndustryAccount[],
  { order, bucketOf }: RegionEntities,
): IndustryStacks {
  const named = new Set<string>(ANALYSIS_INDUSTRIES);
  const industryOf = (account: IndustryAccount) => {
    const name = account.industry.trim();
    return named.has(name) ? name : ANALYSIS_OTHER_INDUSTRY;
  };

  const bars = industries.flatMap((row): IndustryBar[] => {
    const { amount: figure } = row;
    if (figure == null) return [];
    const mix = new Map<string, number>();
    for (const account of accounts) {
      if (industryOf(account) !== row.industry || account.totalArr <= 0) continue;
      const name = bucketOf(account);
      mix.set(name, (mix.get(name) ?? 0) + account.totalArr);
    }
    const mixTotal = [...mix.values()].reduce((sum, amount) => sum + amount, 0);
    const stacks: Record<string, number> =
      mixTotal > 0
        ? Object.fromEntries(
            [...mix.entries()].map(([name, amount]) => [name, (amount / mixTotal) * figure]),
          )
        : { [OTHER_ENTITY]: figure };
    return [{ industry: row.industry, amount: figure, share: row.share, stacks }];
  });

  const drawn = (name: string) => bars.some((bar) => (bar.stacks[name] ?? 0) > 0);
  const legend = [
    ...order.filter((entity) => entity.name !== OTHER_ENTITY && drawn(entity.name)),
    ...(drawn(OTHER_ENTITY) ? [{ name: OTHER_ENTITY, rank: null }] : []),
  ];
  return { bars, legend };
}
