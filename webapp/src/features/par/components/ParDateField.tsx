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

import { useRef, useState } from "react";
import type { SxProps, Theme } from "@wso2/oxygen-ui";
import { Box, IconButton, InputAdornment, TextField } from "@wso2/oxygen-ui";
import { CalendarIcon } from "@wso2/oxygen-ui-icons-react";
import { isPreviewEnabled } from "@config/previewFeatures";
import LeaveDateField from "@features/leave/components/LeaveDateField";

type ParDateFieldProps = {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  label?: string;
  ariaLabel: string;
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
};

// PAR's date fields (the cycle dialogs and the F2F dates): with PAR 2.0 (par2)
// the same calendar picker as Leave, until then the native date field.
export default function ParDateField(props: ParDateFieldProps) {
  return isPreviewEnabled("par2") ? <CalendarDateField {...props} /> : <NativeDateField {...props} />;
}

// The calendar picker. The label sits inside the border like the other fields
// in these forms, or is left out where the screen labels the field itself. A
// typed date outside min/max is never handed on, since no PAR backend
// re-checks the range, and the field says why it was refused.
function CalendarDateField({
  value,
  onChange,
  min,
  max,
  disabled = false,
  error = false,
  helperText,
  label,
  ariaLabel,
  fullWidth = false,
  sx,
}: ParDateFieldProps) {
  return (
    <Box sx={[{ width: fullWidth ? "100%" : 200 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      <LeaveDateField
        label={label}
        ariaLabel={ariaLabel}
        floatingLabel
        explainRange
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        error={error}
        helperText={helperText}
        onChange={onChange}
      />
    </Box>
  );
}

// The native date field with an explicit calendar icon: the browser's own
// indicator is too faint and inconsistent, so it's hidden and replaced with a
// real icon that opens the same native picker via showPicker().
function NativeDateField({
  value,
  onChange,
  min,
  max,
  disabled = false,
  error = false,
  helperText,
  label,
  ariaLabel,
  fullWidth = false,
  sx,
}: ParDateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejection, setRejection] = useState<string | undefined>(undefined);

  return (
    <TextField
      type="date"
      label={label}
      size="small"
      fullWidth={fullWidth}
      value={value}
      disabled={disabled}
      error={error || Boolean(rejection)}
      helperText={rejection ?? helperText}
      onChange={(e) => {
        // min/max on a native date input only constrain the calendar widget:
        // typing a value bypasses them, and no PAR backend re-checks the range.
        // Reject rather than pass through, and say why, since a silent reject
        // would snap the value back with no visible feedback.
        const v = e.target.value;
        if (v && min && v < min) {
          setRejection(`Must be on or after ${min}`);
          return;
        }
        if (v && max && v > max) {
          setRejection(`Must be on or before ${max}`);
          return;
        }
        setRejection(undefined);
        onChange(v);
      }}
      inputRef={inputRef}
      slotProps={{
        inputLabel: label ? { shrink: true } : undefined,
        htmlInput: { min, max, "aria-label": ariaLabel },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                disabled={disabled}
                aria-label="Open date picker"
                onClick={() =>
                  (inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null)?.showPicker?.()
                }
              >
                <CalendarIcon size={16} />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
      sx={{
        "& input[type='date']::-webkit-calendar-picker-indicator": { display: "none" },
        ...sx,
      }}
    />
  );
}
