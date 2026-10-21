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

import { listParam, queryReader, queryWriter, type QueryParamCodec, type QueryParamReader } from "@utils/queryState";
import {
  ANALYSIS_ALL,
  ANALYSIS_BUSINESS_UNITS,
  ANALYSIS_FIRST_SALE,
  analysisBusinessUnitsConflict,
  defaultAnalysisFilters,
  isoCivilDate,
  isSameCivilDate,
  withBusinessUnits,
  type MisAnalysisFilters,
} from "./misAnalysisFilters";
import { lastDayOfMonth, type MisCivilDate } from "./misPacificTime";
import { MIS_SCALES, type MisScale } from "./misViewVocabulary";

// Portfolio's filters as a query string, in the keys the standalone's Portfolio
// writes, so a link from either app opens in the other.
//
// Every value is hostile: a link is typed, truncated and edited by hand. A value
// is recognised in full or it has no effect, and the filter keeps its default.

const SCALE_THOUSANDS = "k";
const AS_OF_CLEARED = "none";
const MAX_LIST_ITEMS = 50;
const MAX_TEXT_LENGTH = 80;
// Partner types come from the data, so any printable name is real; markup and control characters are not.
const UNSAFE_TEXT_PATTERN = /[<>\p{C}]/u;
const AS_OF_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const PRODUCT_COUNT_RANGE = { min: 1, max: 5 };
const LIFETIME_YEARS_RANGE = { min: 0, max: 20 };

const partnerParam: QueryParamCodec<string> = {
  parse: (raw) => (raw.length <= MAX_TEXT_LENGTH && !UNSAFE_TEXT_PATTERN.test(raw) ? raw : undefined),
  format: String,
};

const firstSaleParam: QueryParamCodec<MisAnalysisFilters["firstSale"]> = {
  parse: (raw) =>
    raw === ANALYSIS_FIRST_SALE.ONLY || raw === ANALYSIS_FIRST_SALE.EXCLUDE ? raw : undefined,
  format: String,
};

/** A list of names, bounded in count and in the length of each. */
const textListParam: QueryParamCodec<string[]> = {
  parse: (raw) => {
    const items = listParam.parse(raw)?.filter((item) => item.length <= MAX_TEXT_LENGTH);
    return items?.length ? items.slice(0, MAX_LIST_ITEMS) : undefined;
  },
  format: listParam.format,
};

const businessUnitListParam: QueryParamCodec<string[]> = {
  parse: (raw) => {
    const known = textListParam.parse(raw)?.filter((unit) => ANALYSIS_BUSINESS_UNITS.some((offered) => offered === unit));
    return known?.length && !analysisBusinessUnitsConflict(known) ? known : undefined;
  },
  format: listParam.format,
};

function integerListParam(range: { min: number; max: number }): QueryParamCodec<number[]> {
  return {
    parse: (raw) => {
      const values = listParam
        .parse(raw)
        ?.map(Number)
        .filter((value) => Number.isInteger(value) && value >= range.min && value <= range.max);
      return values?.length ? values : undefined;
    },
    format: (values) => values.join(","),
  };
}

const arrBoundParam: QueryParamCodec<number> = {
  parse: (raw) => {
    const value = Number(raw);
    return raw.trim() !== "" && Number.isFinite(value) && value >= 0 ? value : undefined;
  },
  format: String,
};

const asOfParam: QueryParamReader<MisCivilDate | null> = {
  parse: (raw) => {
    if (raw === AS_OF_CLEARED) return null;
    const match = AS_OF_PATTERN.exec(raw);
    if (!match) return undefined;
    const [year, month, day] = match.slice(1).map(Number);
    const real = month >= 1 && month <= 12 && day >= 1 && day <= lastDayOfMonth(year, month);
    return real ? { year, month, day } : undefined;
  },
};

const scaleParam = {
  parse: (raw: string): MisScale | undefined => (raw === SCALE_THOUSANDS ? MIS_SCALES.THOUSANDS : undefined),
};

export interface MisAnalysisView {
  filters: MisAnalysisFilters;
  /** Present only when the link carried a Scale. */
  scale?: MisScale;
}

/** The query string for a view: empty for the view Portfolio opens on, `scale=k` for thousands. */
export function serializeAnalysisView(
  filters: MisAnalysisFilters,
  { scale, today }: { scale: MisScale; today: MisCivilDate },
): string {
  const query = queryWriter();
  query.setIfChanged("partner", filters.partnerType, ANALYSIS_ALL, partnerParam);
  query.setIfChanged("firstSale", filters.firstSale, ANALYSIS_FIRST_SALE.ALL, firstSaleParam);
  query.setIfChanged("bu", filters.businessUnits, [], businessUnitListParam);
  query.setIfChanged("productsInUse", filters.productCounts, [], integerListParam(PRODUCT_COUNT_RANGE));
  query.setIfChanged("region", filters.salesRegions, [], textListParam);
  query.setIfChanged("subRegion", filters.subRegions, [], textListParam);
  query.setIfChanged("country", filters.countries, [], textListParam);
  query.setIfChanged("lifetime", filters.lifetimeYears, [], integerListParam(LIFETIME_YEARS_RANGE));
  query.setIfChanged("arrMin", filters.arrRange.lower, undefined, arrBoundParam);
  query.setIfChanged("arrMax", filters.arrRange.upper, undefined, arrBoundParam);
  if (filters.asOf === null) query.set("asOf", AS_OF_CLEARED);
  else if (!isSameCivilDate(filters.asOf, today)) query.set("asOf", isoCivilDate(filters.asOf));
  if (scale === MIS_SCALES.THOUSANDS) query.set("scale", SCALE_THOUSANDS);
  return query.toString();
}

/** The view a query string describes; each value it cannot use leaves that filter on its default. */
export function parseAnalysisView(search: string, { today }: { today: MisCivilDate }): MisAnalysisView {
  const query = queryReader(search);
  const defaults = defaultAnalysisFilters(today);

  const bounds = {
    lower: query.read("arrMin", arrBoundParam) ?? null,
    upper: query.read("arrMax", arrBoundParam) ?? null,
  };
  const orderedBounds =
    bounds.lower !== null && bounds.upper !== null && bounds.lower > bounds.upper
      ? { lower: null, upper: null }
      : bounds;

  const asOf = query.read("asOf", asOfParam);

  const filters = withBusinessUnits(
    {
      partnerType: query.read("partner", partnerParam) ?? defaults.partnerType,
      firstSale: query.read("firstSale", firstSaleParam) ?? defaults.firstSale,
      businessUnits: defaults.businessUnits,
      productCounts: query.read("productsInUse", integerListParam(PRODUCT_COUNT_RANGE)) ?? defaults.productCounts,
      salesRegions: query.read("region", textListParam) ?? defaults.salesRegions,
      subRegions: query.read("subRegion", textListParam) ?? defaults.subRegions,
      countries: query.read("country", textListParam) ?? defaults.countries,
      lifetimeYears: query.read("lifetime", integerListParam(LIFETIME_YEARS_RANGE)) ?? defaults.lifetimeYears,
      arrRange: orderedBounds,
      asOf: asOf === undefined ? defaults.asOf : asOf,
    },
    query.read("bu", businessUnitListParam) ?? defaults.businessUnits,
  );

  return { filters, scale: query.read("scale", scaleParam) };
}
