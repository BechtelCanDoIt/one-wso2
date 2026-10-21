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

import { listParam, queryReader, queryWriter, type QueryParamCodec } from "@utils/queryState";
import {
  ANALYSIS_ALL,
  ANALYSIS_FIRST_SALE,
  defaultAnalysisFilters,
  isoCivilDate,
  isSameCivilDate,
  type MisAnalysisFilters,
} from "./misAnalysisFilters";
import type { MisCivilDate } from "./misPacificTime";
import { MIS_SCALES, type MisScale } from "./misViewVocabulary";

// Portfolio's filters as a query string, in the keys the standalone's
// Portfolio writes, so a link from either app opens in the other.

const SCALE_THOUSANDS = "k";
const AS_OF_CLEARED = "none";

const stringParam: QueryParamCodec<string> = { parse: (raw) => raw, format: String };

const firstSaleParam: QueryParamCodec<MisAnalysisFilters["firstSale"]> = {
  parse: (raw) =>
    raw === ANALYSIS_FIRST_SALE.ONLY || raw === ANALYSIS_FIRST_SALE.EXCLUDE ? raw : undefined,
  format: String,
};

const numberListParam: QueryParamCodec<number[]> = {
  parse: (raw) => listParam.parse(raw)?.map(Number),
  format: (values) => values.join(","),
};

const numberParam: QueryParamCodec<number> = { parse: (raw) => Number(raw), format: String };

export interface MisAnalysisView {
  filters: MisAnalysisFilters;
  /** Present only when the link carried a Scale. */
  scale?: MisScale;
}

export function serializeAnalysisView(
  filters: MisAnalysisFilters,
  { scale, today }: { scale: MisScale; today: MisCivilDate },
): string {
  const query = queryWriter();
  query.setIfChanged("partner", filters.partnerType, ANALYSIS_ALL, stringParam);
  query.setIfChanged("firstSale", filters.firstSale, ANALYSIS_FIRST_SALE.ALL, firstSaleParam);
  query.setIfChanged("bu", filters.businessUnits, [], listParam);
  query.setIfChanged("productsInUse", filters.productCounts, [], numberListParam);
  query.setIfChanged("region", filters.salesRegions, [], listParam);
  query.setIfChanged("subRegion", filters.subRegions, [], listParam);
  query.setIfChanged("country", filters.countries, [], listParam);
  query.setIfChanged("lifetime", filters.lifetimeYears, [], numberListParam);
  query.setIfChanged("arrMin", filters.arrRange.lower, undefined, numberParam);
  query.setIfChanged("arrMax", filters.arrRange.upper, undefined, numberParam);
  if (filters.asOf === null) query.set("asOf", AS_OF_CLEARED);
  else if (!isSameCivilDate(filters.asOf, today)) query.set("asOf", isoCivilDate(filters.asOf));
  if (scale === MIS_SCALES.THOUSANDS) query.set("scale", SCALE_THOUSANDS);
  return query.toString();
}

export function parseAnalysisView(search: string, { today }: { today: MisCivilDate }): MisAnalysisView {
  const query = queryReader(search);
  const filters = defaultAnalysisFilters(today);

  filters.partnerType = query.read("partner", stringParam) ?? filters.partnerType;
  filters.firstSale = query.read("firstSale", firstSaleParam) ?? filters.firstSale;
  filters.businessUnits = query.read("bu", listParam) ?? filters.businessUnits;
  filters.productCounts = query.read("productsInUse", numberListParam) ?? filters.productCounts;
  filters.salesRegions = query.read("region", listParam) ?? filters.salesRegions;
  filters.subRegions = query.read("subRegion", listParam) ?? filters.subRegions;
  filters.countries = query.read("country", listParam) ?? filters.countries;
  filters.lifetimeYears = query.read("lifetime", numberListParam) ?? filters.lifetimeYears;
  filters.arrRange = {
    lower: query.read("arrMin", numberParam) ?? null,
    upper: query.read("arrMax", numberParam) ?? null,
  };
  const [year, month, day] = (new URLSearchParams(search).get("asOf") ?? "").split("-").map(Number);
  if (new URLSearchParams(search).get("asOf") === AS_OF_CLEARED) filters.asOf = null;
  else if (year) filters.asOf = { year, month, day };

  const scale = query.read("scale", { parse: (raw) => (raw === SCALE_THOUSANDS ? MIS_SCALES.THOUSANDS : undefined) });
  return { filters, scale };
}
