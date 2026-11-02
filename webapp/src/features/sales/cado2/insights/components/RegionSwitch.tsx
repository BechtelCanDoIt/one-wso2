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

import type { JSX } from "react";
import { ToggleButton, ToggleButtonGroup } from "@wso2/oxygen-ui";

export const REGIONS = ["NA", "EU", "APAC", "LATAM", "ME", "AFRICA"] as const;

/** Global or one region; the selected one is always visible (v2). */
export default function RegionSwitch({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (region: string) => void;
}): JSX.Element {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, v: string | null) => {
        if (v !== null) onChange(v);
      }}
      aria-label="Region"
      sx={{
        bgcolor: "background.paper",
        "& .MuiToggleButton-root": { px: 1.75, py: 0.6, fontWeight: 600, fontSize: 13, textTransform: "none" },
        "& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover": {
          bgcolor: "text.primary",
          color: "background.paper",
        },
      }}
    >
      <ToggleButton value="">Global</ToggleButton>
      {REGIONS.map((r) => (
        <ToggleButton key={r} value={r}>
          {r}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
