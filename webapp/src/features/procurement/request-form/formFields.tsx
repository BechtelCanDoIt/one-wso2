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

// The inputs every step of the request form is built from. A field is a label
// above the control with its example inside; what is typed is only ever
// rendered as text, and free text is capped in length.

import { useId, type ReactNode } from "react";
import {
  alpha,
  Autocomplete,
  Box,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  type Theme,
} from "@wso2/oxygen-ui";
import { XIcon } from "@wso2/oxygen-ui-icons-react";
import type { Choice, YesNo } from "../types";
import { useFieldError } from "./fieldErrors";
import { LONG_MAX, SHORT_MAX } from "./fieldLimits";

export function FieldLabel({
  children,
  required,
  htmlFor,
  id,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
  id?: string;
}) {
  return (
    <Typography component="label" htmlFor={htmlFor} id={id} variant="body2" sx={{ display: "block", fontWeight: 500, mb: 0.75 }}>
      {children}
      {required && (
        <Box component="span" aria-hidden="true" sx={{ ml: 0.4 }}>
          *
        </Box>
      )}
    </Typography>
  );
}

/** A small uppercase heading that starts a group of related fields. */
export function SectionHeading({ children, first }: { children: ReactNode; first?: boolean }) {
  return (
    <Box sx={{ pt: first ? 0 : 1.5, mt: first ? 0 : 1, borderTop: first ? 0 : 1, borderColor: "divider" }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: "0.07em", fontSize: 11 }}>
        {children}
      </Typography>
    </Box>
  );
}

export function TextInput({
  label,
  name = label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
  min = 1,
  maxLength,
  multiline,
  minRows,
  disabled,
}: {
  label: string;
  name?: string;
  value: string;
  onChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "email" | "number" | "date" | "url" | "tel";
  /** The smallest number a number field takes. */
  min?: number;
  /** The most characters it takes, when the backend allows fewer than the usual cap. */
  maxLength?: number;
  multiline?: boolean;
  minRows?: number;
  disabled?: boolean;
}) {
  const error = useFieldError(name);
  return (
    <Box sx={{ minWidth: 0 }} data-field-error={error ? "true" : undefined}>
      <TextField
        label={label}
        error={Boolean(error)}
        helperText={error}
        size="small"
        fullWidth
        required={required}
        disabled={disabled}
        type={type}
        multiline={multiline}
        minRows={minRows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { maxLength: maxLength ?? (multiline ? LONG_MAX : SHORT_MAX), ...(type === "number" ? { min } : {}) },
        }}
      />
    </Box>
  );
}

/** The ✕ every searchable field clears with, kept small so it does not outweigh the text. */
export function SmallClearIcon() {
  return <XIcon size={14} />;
}

/** A step's title: bold, with a line under it, so it outranks the labels and section headings below. */
export function StepTitle({ children }: { children: ReactNode }) {
  return (
    <Typography variant="h5" component="h2" sx={{ fontWeight: 700, pb: 2, borderBottom: 1, borderColor: "divider" }}>
      {children}
    </Typography>
  );
}

/** Yes/No questions as one bordered list of rows. */
export function YesNoList({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden", "& > * + *": { borderTop: 1, borderColor: "divider" } }}>
      {children}
    </Box>
  );
}

/**
 * A Yes/No question: the question on the left, the answer on the right. What is
 * asked next, when the answer is Yes, opens inside the same row.
 *
 * @param bare - Drop the row's own padding, for a question nested inside another's follow-up
 */
export function YesNoField({
  label,
  name = label,
  value,
  onChange,
  disabled,
  bare,
  children,
}: {
  label: string;
  name?: string;
  value: YesNo | "";
  onChange: (value: YesNo) => void;
  disabled?: boolean;
  bare?: boolean;
  children?: ReactNode;
}) {
  const error = useFieldError(name);
  const errorId = useId();
  return (
    <Box sx={{ px: bare ? 0 : 2.25, py: bare ? 0 : 1.75 }} data-field-error={error ? "true" : undefined}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2.5,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {label}
          <Box component="span" aria-hidden="true" sx={{ ml: 0.4 }}>
            *
          </Box>
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          disabled={disabled}
          value={value || null}
          onChange={(_, next: YesNo | null) => next && onChange(next)}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          sx={{
            flexShrink: 0,
            "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 500, minWidth: 76, px: 2 },
            "& .MuiToggleButton-root.Mui-selected": {
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "&:hover": { bgcolor: "primary.dark" },
            },
          }}
        >
          <ToggleButton value="yes">Yes</ToggleButton>
          <ToggleButton value="no">No</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {error && (
        <Typography id={errorId} role="alert" variant="caption" color="error" sx={{ display: "block", mt: 0.75 }}>
          {error}
        </Typography>
      )}
      {value === "yes" && children && (
        <Stack
          spacing={2.5}
          sx={{ mt: 2, pl: 2, borderLeft: 2, borderColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.3) }}
        >
          {children}
        </Stack>
      )}
    </Box>
  );
}

/** Lists up to this long are a plain select; longer ones are searched as you type. */
const SELECT_MAX = 10;

/**
 * A select over a short list, for a value that has to be chosen.
 *
 * @param labels - What to show for a value, when it is not the value itself
 */
export function SelectField({
  label,
  name = label,
  options,
  value,
  onChange,
  required,
  placeholder = "Select",
  labels,
  disabled,
}: {
  label: string;
  name?: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  labels?: Readonly<Record<string, string>>;
  disabled?: boolean;
}) {
  const error = useFieldError(name);
  const textOf = (v: string): string => labels?.[v] ?? v;
  // A saved value that is no longer in the list stays selectable, so editing a request never blanks it.
  const items = value && !options.includes(value) ? [...options, value] : options;
  return (
    <Box sx={{ minWidth: 0 }} data-field-error={error ? "true" : undefined}>
      <TextField
        select
        label={label}
        error={Boolean(error)}
        helperText={error}
        required={required}
        size="small"
        fullWidth
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        slotProps={{
          inputLabel: { shrink: true },
          select: {
            displayEmpty: true,
            renderValue: (selected) =>
              selected ? (
                textOf(String(selected))
              ) : (
                <Box component="span" sx={{ color: "text.disabled" }}>
                  {placeholder}
                </Box>
              ),
          },
        }}
      >
        {items.map((item) => (
          <MenuItem key={item} value={item}>
            {textOf(item)}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}

/**
 * A pick from a list of codes, shown by their labels. One rule for every list: a
 * short required list is a select; a short optional list is a select you can
 * also clear with the X; a long list is searched as you type. Only a listed
 * value can be chosen.
 *
 * @param emptyText - What the field says when there is nothing to choose from, such as before a dependent list is asked for
 */
export function OptionField({
  label,
  choices,
  value,
  onChange,
  required,
  placeholder,
  emptyText,
  disabled,
  name = label,
}: {
  label: string;
  name?: string;
  choices: readonly Choice[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const error = useFieldError(name);
  // A saved value that is no longer in the list stays selectable, so editing a request never blanks it.
  const items: Choice[] = value && !choices.some((c) => c.value === value) ? [...choices, { value, label: value }] : [...choices];
  const prompt = items.length === 0 && emptyText ? emptyText : (placeholder ?? "Select");
  if (items.length <= SELECT_MAX && required) {
    return (
      <SelectField
        required
        label={label}
        name={name}
        options={items.map((c) => c.value)}
        labels={Object.fromEntries(items.map((c) => [c.value, c.label]))}
        value={value}
        onChange={onChange}
        placeholder={prompt}
        disabled={disabled || items.length === 0}
      />
    );
  }
  return (
    <Box sx={{ minWidth: 0 }} data-field-error={error ? "true" : undefined}>
      <Autocomplete
        id={id}
        forcePopupIcon
        size="small"
        clearIcon={<SmallClearIcon />}
        options={items}
        value={items.find((c) => c.value === value) ?? null}
        getOptionLabel={(c) => c.label}
        isOptionEqualToValue={(a, b) => a.value === b.value}
        onChange={(_, next) => onChange(next?.value ?? "")}
        disabled={disabled}
        noOptionsText={emptyText ?? "No options"}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={Boolean(error)}
            helperText={error}
            required={required}
            placeholder={prompt}
            InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
          />
        )}
      />
    </Box>
  );
}

/** Several short entries in one field: type one and press Enter to add it as a chip. */
export function ChipsField({
  label,
  name = label,
  values,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  name?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const error = useFieldError(name);
  const clean = (entries: string[]): string[] =>
    entries
      .map((entry) => entry.trim())
      .filter((entry, index, all) => entry !== "" && all.findIndex((e) => e.toLowerCase() === entry.toLowerCase()) === index);
  return (
    <Box sx={{ minWidth: 0 }} data-field-error={error ? "true" : undefined}>
      <Autocomplete
        clearIcon={<SmallClearIcon />}
        id={id}
        multiple
        freeSolo
        autoSelect
        size="small"
        options={[] as string[]}
        value={values}
        disabled={disabled}
        onChange={(_, next) => onChange(clean(next))}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={Boolean(error)}
            helperText={error}
            required={required}
            placeholder={values.length ? "" : placeholder}
            InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
            inputProps={{ ...params.inputProps, maxLength: SHORT_MAX, "aria-required": required || undefined }}
          />
        )}
      />
    </Box>
  );
}
