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

import { Chip, Stack } from "@wso2/oxygen-ui";

/** A row of chips that picks one value; the chosen one is filled. */
export default function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Stack direction="row" role="group" aria-label={label} spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Chip
            key={option.value}
            label={option.label}
            clickable
            color={selected ? "primary" : "default"}
            variant={selected ? "filled" : "outlined"}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
          />
        );
      })}
    </Stack>
  );
}
