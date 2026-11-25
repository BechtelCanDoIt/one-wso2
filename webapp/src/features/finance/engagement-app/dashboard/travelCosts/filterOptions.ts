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

import type { TravelCosts } from "../../api/dashboardTypes";
import { COST_SOURCE_LABEL } from "../travelCostText";
import { PAID_LABEL } from "./costFormat";
import type { FilterKey } from "./costView";

type Option = readonly [string, string];

/** The label a filter chip or dialog field uses. */
export const FILTER_LABEL: Readonly<Record<FilterKey, string>> = {
  tcSource: "Source",
  tcEmployee: "Employee",
  tcJob: "Travel Job Number",
  tcCountry: "Destination Country",
  tcAgent: "Travel Agent",
  tcPaid: "Engagement",
  tcCustomer: "Customer",
  tcCostType: "Cost Type",
  tcUnlinked: "Without a Job Number",
};

/** The options a filter offers, from the facets of the range (built before the filters, so a list never empties itself). */
export function filterOptions(key: FilterKey, facets: TravelCosts["facets"] | undefined): readonly Option[] {
  switch (key) {
    case "tcSource":
      return (Object.keys(COST_SOURCE_LABEL) as (keyof typeof COST_SOURCE_LABEL)[]).map((s) => [s, COST_SOURCE_LABEL[s]] as const);
    case "tcCountry":
      return [...(facets?.countries ?? []), "Unknown"].filter((v, i, all) => all.indexOf(v) === i).map((c) => [c, c] as const);
    case "tcAgent":
      return [["0", "No travel agent"] as const, ...(facets?.travelAgents ?? []).map((a) => [String(a.id), a.name] as const)];
    case "tcPaid":
      return (Object.keys(PAID_LABEL) as (keyof typeof PAID_LABEL)[]).map((p) => [p, PAID_LABEL[p]] as const);
    case "tcCustomer":
      return (facets?.customers ?? []).map((c) => [c, c] as const);
    case "tcCostType":
      return (facets?.costTypes ?? []).map((c) => [c, c] as const);
    default:
      return [];
  }
}

/** What a chip says for one filter's values: the labels, the first two, and "+n". */
export function describeFilter(key: FilterKey, values: readonly string[], facets: TravelCosts["facets"] | undefined): string {
  if (key === "tcUnlinked") return "Yes";
  const options = filterOptions(key, facets);
  const labels = values.map((v) => options.find((o) => o[0] === v)?.[1] ?? v);
  return labels.length > 2 ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}` : labels.join(", ");
}

