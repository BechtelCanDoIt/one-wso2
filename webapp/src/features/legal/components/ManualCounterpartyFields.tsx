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
import { Autocomplete, Box, TextField } from "@wso2/oxygen-ui";
import { COUNTRY_OPTIONS, type CountryOption } from "@features/legal/countries";
import {
  MANUAL_FIELD_MAX_LENGTH,
  missingManualFields,
  type ManualCounterparty,
} from "@features/legal/manualCounterparty";

type TextFieldKey = keyof typeof MANUAL_FIELD_MAX_LENGTH;

const TEXT_FIELDS: { key: TextFieldKey; label: string; required: boolean; helper?: string }[] = [
  {
    key: "name",
    label: "Legal name",
    required: true,
    helper: "The registered company name, exactly as it should appear in the NDA.",
  },
  {
    key: "street",
    label: "Street address",
    required: true,
    helper: "Must be the counterparty's registered address.",
  },
  { key: "city", label: "City", required: true },
  { key: "state", label: "State / province", required: false },
  { key: "postalCode", label: "Postal code", required: false },
];

interface ManualCounterpartyFieldsProps {
  value: ManualCounterparty;
  onChange: (next: ManualCounterparty) => void;
}

/**
 * The form for an NDA party that isn't a Salesforce customer. A required field
 * only shows its error once the user has left it, so an empty form doesn't
 * open covered in red.
 */
export default function ManualCounterpartyFields({ value, onChange }: ManualCounterpartyFieldsProps): JSX.Element {
  const [touched, setTouched] = useState<Partial<Record<keyof ManualCounterparty, boolean>>>({});
  const missing = new Set<string>(missingManualFields(value));
  const showError = (key: keyof ManualCounterparty) => Boolean(touched[key]) && missing.has(key);
  const markTouched = (key: keyof ManualCounterparty) => setTouched((t) => ({ ...t, [key]: true }));

  const selectedCountry = COUNTRY_OPTIONS.find((c) => c.code === value.countryCode) ?? null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {TEXT_FIELDS.map(({ key, label, required, helper }) => (
        <TextField
          key={key}
          fullWidth
          label={label}
          required={required}
          value={value[key]}
          onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          onBlur={() => markTouched(key)}
          error={showError(key)}
          helperText={showError(key) ? `${label} is required.` : helper}
          slotProps={{ htmlInput: { maxLength: MANUAL_FIELD_MAX_LENGTH[key] } }}
        />
      ))}
      <Autocomplete<CountryOption>
        fullWidth
        options={COUNTRY_OPTIONS as CountryOption[]}
        value={selectedCountry}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, selected) => option.code === selected.code}
        onChange={(_e, next) => onChange({ ...value, countryCode: next?.code ?? "" })}
        onBlur={() => markTouched("countryCode")}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Country"
            required
            error={showError("countryCode")}
            helperText={
              showError("countryCode")
                ? "Country is required."
                : "Fills in the WSO2 Company below, which sets the governing law."
            }
          />
        )}
      />
    </Box>
  );
}
