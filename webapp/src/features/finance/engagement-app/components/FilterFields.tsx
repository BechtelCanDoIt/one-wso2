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

import type { JSX, ReactNode } from "react";
import { Box, Button, MenuItem, Stack, TextField, Typography, type AutocompleteRenderInputParams } from "@wso2/oxygen-ui";
import { FILTER_WIDE_SX } from "./eaStyles";

type Option = string | readonly [string, string];

/** A filter select: floating label, "Any" when empty, same height as the date fields. */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  anyLabel = "Any",
  required,
  disabled,
}: {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (v: string) => void;
  anyLabel?: string | null;
  required?: boolean;
  disabled?: boolean;
}): JSX.Element {
  const pairs = options.map((o) => (typeof o === "string" ? ([o, o] as const) : o));
  return (
    <TextField
      select
      fullWidth
      size="small"
      label={label}
      value={value}
      required={required}
      disabled={disabled}
      onChange={(ev) => onChange(ev.target.value)}
      slotProps={{
        inputLabel: { shrink: true },
        select: {
          displayEmpty: true,
          renderValue: (v) =>
            v ? (
              (pairs.find((p) => p[0] === v)?.[1] ?? String(v))
            ) : (
              <Typography component="span" color="text.secondary">
                {anyLabel ?? ""}
              </Typography>
            ),
        },
      }}
    >
      {anyLabel !== null ? (
        <MenuItem value="">
          <em>{anyLabel}</em>
        </MenuItem>
      ) : null}
      {pairs.map(([v, l]) => (
        <MenuItem key={v} value={v}>
          {l}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function FilterDate({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}): JSX.Element {
  return (
    <TextField
      fullWidth
      size="small"
      type="date"
      label={label}
      value={value}
      onChange={(ev) => onChange(ev.target.value)}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { min, max } }}
    />
  );
}

/** Start and End Date side by side, so the End Date never wraps onto a row of its own. */
export function FilterDateRange({ from, to, onChange }: { from: string; to: string; onChange: (next: { from: string; to: string }) => void }): JSX.Element {
  return (
    <Box sx={{ ...FILTER_WIDE_SX, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
      <FilterDate label="Start Date" value={from} onChange={(v) => onChange({ from: v, to })} />
      <FilterDate label="End Date" value={to} onChange={(v) => onChange({ from, to: v })} />
    </Box>
  );
}

/** The input for an Autocomplete filter, with the same floating label. */
export function FilterInput({ params, label, placeholder = "Any" }: { params: AutocompleteRenderInputParams; label: string; placeholder?: string }): JSX.Element {
  return <TextField {...params} label={label} placeholder={placeholder} slotProps={{ inputLabel: { ...params.InputLabelProps, shrink: true } }} />;
}

/** Fields in a grid; Search and Reset together on the right of the actions row, other actions (export, bulk) on its left. */
export function FilterBar({
  children,
  onSearch,
  onReset,
  searchLabel = "Search",
  start,
  end,
  error,
}: {
  children: ReactNode;
  onSearch?: () => void;
  onReset?: () => void;
  searchLabel?: string;
  start?: ReactNode;
  end?: ReactNode;
  error?: ReactNode;
}): JSX.Element {
  const buttons = (
    <>
      {end}
      {onReset ? (
        <Button size="small" variant="outlined" onClick={onReset}>
          Reset
        </Button>
      ) : null}
      {onSearch ? (
        <Button size="small" variant="contained" onClick={onSearch}>
          {searchLabel}
        </Button>
      ) : null}
    </>
  );
  // With no other actions, the buttons sit in the fields' last row instead of a row of their own.
  const inline = !start;
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 1.5, alignItems: "start" }}>
        {children}
        {inline ? <Stack direction="row" spacing={1} sx={{ alignItems: "center", minHeight: 40 }}>{buttons}</Stack> : null}
      </Box>
      {inline ? null : (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
          {start}
          <Box sx={{ flex: 1 }} />
          {buttons}
        </Stack>
      )}
      {error ? <Box sx={{ mt: 1 }}>{error}</Box> : null}
    </Box>
  );
}
