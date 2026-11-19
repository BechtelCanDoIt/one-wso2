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

import { useState, type JSX } from "react";
import { Autocomplete, Box, TextField, Typography } from "@wso2/oxygen-ui";
import { useDebouncedValue } from "@hooks/useDebouncedValue";
import type { EmployeeOption } from "../api/engagementTypes";
import { useEmployees } from "../api/useEngagementApi";

/** An employee, searched by name or email as you type (from two letters). */
export default function PersonPicker({
  label,
  value,
  onChange,
  required,
  error,
  placeholder = "Search by name or email",
}: {
  readonly label: string;
  readonly value: EmployeeOption | null;
  readonly onChange: (p: EmployeeOption | null) => void;
  readonly required?: boolean;
  readonly error?: string;
  readonly placeholder?: string;
}): JSX.Element {
  const [text, setText] = useState("");
  const q = useDebouncedValue(text.trim(), 250);
  const people = useEmployees(q, q.length >= 2, 20);
  return (
    <Autocomplete
      size="small"
      options={q.length >= 2 ? (people.data ?? []) : []}
      value={value}
      onChange={(_, v) => onChange(v)}
      onInputChange={(_, v, reason) => (reason === "input" ? setText(v) : undefined)}
      getOptionLabel={(o) => o.name || o.email}
      isOptionEqualToValue={(a, b) => a.email === b.email}
      filterOptions={(x) => x}
      loading={people.isFetching}
      noOptionsText={q.length < 2 ? "Type at least 2 letters to search" : people.isError ? "Couldn't search employees" : "Nobody matches"}
      renderOption={(props, o) => (
        <li {...props} key={o.email}>
          <Box>
            <Box sx={{ fontSize: 13.5 }}>{o.name}</Box>
            <Typography variant="caption" color="text.secondary">
              {o.email}
            </Typography>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          required={required}
          label={label}
          placeholder={placeholder}
          error={Boolean(error)}
          helperText={error}
          slotProps={{ inputLabel: { ...params.InputLabelProps, shrink: placeholder ? true : undefined } }}
        />
      )}
    />
  );
}
