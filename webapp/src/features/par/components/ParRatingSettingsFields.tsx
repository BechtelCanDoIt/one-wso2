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

import { Autocomplete, Chip, ComplexSelect, Grid, TextField, Typography } from "@wso2/oxygen-ui";
import {
  RATING_RULES,
  ruleChoices,
  withRatingList,
  type RatingRule,
  type RatingSettings,
} from "../util/parRatingSettings";

const RULE_LABELS: Record<RatingRule, string> = {
  top5p20pEnabledRating: "Unlocks Top 5%/20%",
  evidenceEnabledRating: "Needs evidence",
  missedDeadlineRating: "Missed deadline: employees",
  leadershipMissedDeadlineRating: "Missed deadline: leadership",
};

// The ratings for employees and for the leadership group, and the rules that
// depend on them, for Create PAR Cycle and Configurations. A rule only offers
// ratings it can be, and is cleared when its rating leaves the list; one that
// arrives as something else shows blank, to be picked.
export default function ParRatingSettingsFields({
  value,
  onChange,
  suggestions,
  disabled = false,
}: {
  value: RatingSettings;
  onChange: (value: RatingSettings) => void;
  /** Rating names already in use, offered while typing. */
  suggestions: string[];
  disabled?: boolean;
}) {
  const choices = ruleChoices(value);

  const listField = (list: "employeeRatings" | "leadershipAllowedRatings", label: string) => (
    <Autocomplete
      multiple
      freeSolo
      disabled={disabled}
      options={suggestions.filter((s) => !value[list].includes(s))}
      value={value[list]}
      onChange={(_e, next) => onChange(withRatingList(value, list, next as string[]))}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return <Chip key={key} variant="outlined" label={option} {...tagProps} />;
        })
      }
      renderInput={(params) => <TextField {...params} label={label} size="small" aria-label={label} />}
    />
  );

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Typography variant="subtitle2">Ratings</Typography>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>{listField("employeeRatings", "Employees")}</Grid>
      <Grid size={{ xs: 12, sm: 6 }}>{listField("leadershipAllowedRatings", "Leadership group")}</Grid>
      <Grid size={12}>
        <Typography variant="subtitle2">Rules</Typography>
      </Grid>
      {RATING_RULES.map((rule) => (
        <Grid key={rule} size={{ xs: 12, sm: 6 }}>
          <ComplexSelect
            label={RULE_LABELS[rule]}
            labelAnchor="border"
            fullWidth
            required
            disabled={disabled}
            error={!choices[rule].includes(value[rule])}
            value={choices[rule].includes(value[rule]) ? value[rule] : ""}
            onChange={(e) => onChange({ ...value, [rule]: e.target.value as string })}
          >
            {choices[rule].map((rating) => (
              <ComplexSelect.MenuItem key={rating} value={rating}>
                {rating}
              </ComplexSelect.MenuItem>
            ))}
          </ComplexSelect>
        </Grid>
      ))}
    </Grid>
  );
}
