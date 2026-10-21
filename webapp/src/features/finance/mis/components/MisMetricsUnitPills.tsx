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

import { Box, ButtonBase } from "@wso2/oxygen-ui";
import { MIS_METRICS_UNITS } from "../util/misUnits";
import { CUSTOM_UNIT, type MisAppliedFilters } from "../util/misViewVocabulary";
import { unitPillSx } from "./misLookTokens";
import { CustomUnitCard } from "./MisUnitPills";
import type { MisUnitSelection } from "./MisUnitTabs";

// The Unit pills under Region Summary › All ARR Metrics: the eight the
// standalone shows (`RegionSummaryTabs.js`), starting on All BU. Custom Product
// Selection is a pill here rather than a tab, and opens the same chip lists the
// Build's Custom tab does.
//
// The three fields are the metrics view's own copy; the Build's Unit above the
// grid is a different selection and is never read or written from here.

export type MisMetricsUnitFields = Pick<
  MisAppliedFilters,
  "metricsUnit" | "metricsCustomBusinessUnits" | "metricsCustomProductUnits"
>;

export default function MisMetricsUnitPills({
  fields,
  businessUnitOptions,
  productUnitOptions,
  onChange,
}: {
  fields: MisMetricsUnitFields;
  businessUnitOptions: readonly string[];
  productUnitOptions: readonly string[];
  onChange: (next: MisMetricsUnitFields) => void;
}) {
  const choose = (code: string) =>
    onChange({ metricsUnit: code, metricsCustomBusinessUnits: [], metricsCustomProductUnits: [] });

  const asSelection: MisUnitSelection = {
    buProductSelection: fields.metricsUnit,
    customBusinessUnits: fields.metricsCustomBusinessUnits,
    customProductUnits: fields.metricsCustomProductUnits,
  };

  return (
    <>
      <Box role="group" aria-label="Unit" sx={{ display: "flex", flexWrap: "wrap", gap: 1, py: 1, mb: 0.5 }}>
        {MIS_METRICS_UNITS.map((unit) => {
          const active = unit.code === fields.metricsUnit;
          return (
            <ButtonBase key={unit.code} aria-pressed={active} onClick={() => choose(unit.code)} sx={unitPillSx(active)}>
              {unit.label}
            </ButtonBase>
          );
        })}
      </Box>
      {fields.metricsUnit === CUSTOM_UNIT && (
        <CustomUnitCard
          selection={asSelection}
          businessUnitOptions={businessUnitOptions}
          productUnitOptions={productUnitOptions}
          onChange={(next) =>
            onChange({
              metricsUnit: next.buProductSelection,
              metricsCustomBusinessUnits: next.customBusinessUnits,
              metricsCustomProductUnits: next.customProductUnits,
            })
          }
        />
      )}
    </>
  );
}
