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
import { Controller, useFormContext, useWatch } from "react-hook-form";
import {
  Alert,
  Chip,
  DatePickers,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { CalendarDaysIcon, LockIcon } from "@wso2/oxygen-ui-icons-react";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import { useAccountOpportunities } from "@features/sales/cado2/quotes/api/useQuoteApi";
import {
  MULTI_YEAR_OPTIONS,
  formatDate,
  hasRecurring,
  isShortMode,
  parseDateString,
  shortTermLatestEnd,
  shortTermProblem,
  termEnd,
  toDateString,
  type DraftFormValues,
} from "@features/sales/cado2/quotes/form/draftForm";
import { expectedRenewalStart } from "@features/sales/cado2/quotes/form/renewalStart";
import { subscriptionPeriod } from "@features/sales/cado2/utils/subscription";
import { useFieldIssue } from "@features/sales/cado2/quotes/components/fieldIssues";

const { DatePicker } = DatePickers;

/** How long the term runs, as the AM picks it; "Less than a year" covers Co-termed and Shorter term. */
type Duration = "ONE_YEAR" | "MULTI_YEAR" | "UNDER_YEAR";

const DURATIONS: readonly { value: Duration; label: string }[] = [
  { value: "ONE_YEAR", label: "1 year" },
  { value: "MULTI_YEAR", label: "Multi-year" },
  { value: "UNDER_YEAR", label: "Less than a year" },
];

/**
 * Step 2's Term card (D73): when the quote starts, and, when a line recurs,
 * how long it runs.
 *
 *   Start      renewal: the day after the renewed opportunity ends, locked
 *              fresh sale / expansion: the AM picks it
 *   1 year     end worked out
 *   Multi-year end worked out from the years; billing chosen here
 *   Less than a year
 *     expansion: "Co-terminated with an existing opportunity?"
 *                yes → pick it → its end date      no → the AM types the end
 *     renewal or fresh sale: a short term (needs approval); the AM types the end
 */
/**
 * Why the duration isn't asked: no line is charged every year. Whether a line
 * is comes from its product's Salesforce classification, not its category (D76).
 */
function termNote(lines: readonly unknown[]): string {
  if (lines.length === 0) {
    return "The duration is asked once a recurring product (charged every year) is added below.";
  }
  return "No recurring products: no subscription term. Only the contract total (TCV) applies.";
}

export default function SubscriptionTermCard(): JSX.Element {
  const { control, setValue } = useFormContext<DraftFormValues>();
  const [
    accountId,
    isRenewal,
    dealKind,
    previousIds,
    startDate,
    termMode,
    termYears,
    termEndDate,
    coTermId,
    lines,
  ] = useWatch({
    control,
    name: [
      "accountId",
      "isRenewal",
      "dealKind",
      "previousOpportunityIds",
      "startDate",
      "termMode",
      "termYears",
      "termEndDate",
      "coTermOpportunityId",
      "lines",
    ],
  });
  // The account's won opportunities: the ones renewed, and the contracts an expansion can co-terminate with.
  const won = useAccountOpportunities(accountId || null, "won");
  const expected = isRenewal
    ? expectedRenewalStart(
        (won.data ?? []).filter((o) => previousIds.includes(o.id)),
      )
    : null;
  const startLocked = Boolean(expected);
  const recurring = hasRecurring(lines);
  const expansion = dealKind === "EXPANSION";
  const [underYear, setUnderYear] = useState(isShortMode(termMode));
  const duration: Duration | "" =
    termMode === "ONE_YEAR" || termMode === "MULTI_YEAR"
      ? termMode
      : underYear || isShortMode(termMode)
        ? "UNDER_YEAR"
        : "";
  const end = termEnd({ startDate, termMode, termYears, termEndDate });

  const startIssue = useFieldIssue("subscriptionStartDate");
  const modeIssue = useFieldIssue("termMode");
  const yearsIssue = useFieldIssue("termYears");
  const endIssue = useFieldIssue("subscriptionEndDate");
  const coTermIssue = useFieldIssue("coTermOpportunityId");
  const billingIssue = useFieldIssue("billingFrequency");
  const typedProblem =
    termMode === "SHORTER" ? shortTermProblem(startDate, termEndDate, "SHORTER") : "";

  const chooseDuration = (d: Duration) => {
    setUnderYear(d === "UNDER_YEAR");
    if (d === "UNDER_YEAR") {
      // An expansion answers the co-term question first; anything else is a short term.
      setValue("termMode", expansion ? "" : "SHORTER", { shouldDirty: true });
    } else {
      setValue("termMode", d, { shouldDirty: true });
    }
    setValue("termEndDate", "", { shouldDirty: true });
    setValue("coTermOpportunityId", "", { shouldDirty: true });
    setValue("coTermOpportunityName", "", { shouldDirty: true });
  };
  const chooseCoTerm = (id: string) => {
    const o = (won.data ?? []).find((x) => x.id === id);
    setValue("coTermOpportunityId", id, { shouldDirty: true });
    setValue("coTermOpportunityName", o?.name ?? "", { shouldDirty: true });
    // It ends with that opportunity.
    setValue("termEndDate", o?.subsEndDate ?? "", { shouldDirty: true });
  };
  // Contracts still running at the start, ending the soonest first.
  const coTermOptions = (won.data ?? [])
    .filter((o) => o.subsEndDate && (!startDate || o.subsEndDate >= startDate))
    .sort((a, b) => (a.subsEndDate ?? "").localeCompare(b.subsEndDate ?? ""));

  return (
    <SectionCard
      title="Term"
      icon={<CalendarDaysIcon size={18} />}
      aside={
        startDate && end ? (
          <Chip
            size="small"
            variant="outlined"
            color="primary"
            label={`${formatDate(startDate)} – ${formatDate(end)}`}
          />
        ) : undefined
      }
    >
      <Stack spacing={2}>
        <Controller
          name="startDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Start date"
              value={parseDateString(field.value)}
              readOnly={startLocked}
              onChange={(d: Date | null) =>
                field.onChange(
                  d && !Number.isNaN(d.getTime()) ? toDateString(d) : "",
                )
              }
              slotProps={{
                textField: {
                  size: "small",
                  required: true,
                  error: Boolean(startIssue),
                  helperText:
                    startIssue ??
                    (expected
                      ? `The day after ${expected.fromName || "the renewed opportunity"} ends, in Salesforce`
                      : undefined),
                  InputProps: startLocked
                    ? {
                        endAdornment: (
                          <LockIcon size={14} aria-label="Locked" />
                        ),
                      }
                    : undefined,
                  sx: { maxWidth: 260 },
                },
              }}
            />
          )}
        />
        {isRenewal && !expected && previousIds.length > 0 ? (
          <Alert severity="info" variant="outlined">
            The renewed opportunity has no subscription end date in Salesforce (
            <code>Subs_End_Date__c</code>), so the start date can&apos;t be
            worked out. Choose it.
          </Alert>
        ) : null}

        {recurring ? (
          <>
            <RadioGroup
              row
              value={duration}
              onChange={(_, v) => chooseDuration(v as Duration)}
              aria-label="Duration"
            >
              {DURATIONS.map((d) => (
                <FormControlLabel
                  key={d.value}
                  value={d.value}
                  control={<Radio />}
                  label={d.label}
                />
              ))}
            </RadioGroup>
            {modeIssue && duration !== "UNDER_YEAR" ? (
              <Typography variant="caption" color="error">
                {modeIssue}
              </Typography>
            ) : null}

            {termMode === "MULTI_YEAR" ? (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ sm: "center" }}
              >
                <Controller
                  name="termYears"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Years"
                      size="small"
                      sx={{ minWidth: 140 }}
                      error={Boolean(yearsIssue)}
                      helperText={yearsIssue}
                    >
                      {MULTI_YEAR_OPTIONS.map((n) => (
                        <MenuItem key={n} value={String(n)}>
                          {n} years
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  name="billingFrequency"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      row
                      value={field.value}
                      onChange={(_, v) => field.onChange(v)}
                      aria-label="Billing frequency"
                    >
                      <FormControlLabel
                        value="ANNUAL"
                        control={<Radio />}
                        label="Annual billing"
                      />
                      <FormControlLabel
                        value="UPFRONT"
                        control={<Radio />}
                        label="Full amount upfront"
                      />
                    </RadioGroup>
                  )}
                />
              </Stack>
            ) : null}
            {termMode === "MULTI_YEAR" && billingIssue ? (
              <Typography variant="caption" color="error">
                {billingIssue}
              </Typography>
            ) : null}

            {duration === "UNDER_YEAR" && expansion ? (
              <Stack spacing={1}>
                <Typography variant="body2">
                  Is this expansion co-terminated with an existing opportunity?
                </Typography>
                <RadioGroup
                  row
                  value={
                    termMode === "CO_TERMED"
                      ? "yes"
                      : termMode === "SHORTER"
                        ? "no"
                        : ""
                  }
                  onChange={(_, v) => {
                    setValue(
                      "termMode",
                      v === "yes" ? "CO_TERMED" : "SHORTER",
                      { shouldDirty: true },
                    );
                    setValue("termEndDate", "", { shouldDirty: true });
                    setValue("coTermOpportunityId", "", { shouldDirty: true });
                    setValue("coTermOpportunityName", "", {
                      shouldDirty: true,
                    });
                  }}
                  aria-label="Co-terminated"
                >
                  <FormControlLabel
                    value="yes"
                    control={<Radio />}
                    label="Yes"
                  />
                  <FormControlLabel value="no" control={<Radio />} label="No" />
                </RadioGroup>
                {modeIssue && !termMode ? (
                  <Typography variant="caption" color="error">
                    Say whether it is co-terminated
                  </Typography>
                ) : null}
              </Stack>
            ) : null}

            {termMode === "CO_TERMED" ? (
              <TextField
                select
                size="small"
                label="Co-terminates with"
                value={coTermId}
                onChange={(e) => chooseCoTerm(e.target.value)}
                error={Boolean(coTermIssue)}
                helperText={
                  coTermIssue ??
                  (end
                    ? `Ends ${formatDate(end)}, with it`
                    : "The term ends when this opportunity ends")
                }
                sx={{ maxWidth: 520 }}
              >
                {coTermOptions.length === 0 ? (
                  <MenuItem value="" disabled>
                    {won.error
                      ? "Couldn't load the account's opportunities from Salesforce" // not "none" (2026-10-13)
                      : "No won opportunity of this account runs past the start date"}
                  </MenuItem>
                ) : null}
                {coTermOptions.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.name ?? o.id} ·{" "}
                    {subscriptionPeriod({
                      subsStartDate: o.subsStartDate,
                      subsEndDate: o.subsEndDate,
                    })}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}

            {termMode === "SHORTER" ? (
              <>
                <Controller
                  name="termEndDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="End date"
                      value={parseDateString(field.value)}
                      minDate={parseDateString(startDate) ?? undefined}
                      maxDate={
                        startDate
                          ? (parseDateString(shortTermLatestEnd(startDate)) ??
                            undefined)
                          : undefined
                      }
                      onChange={(d: Date | null) =>
                        field.onChange(
                          d && !Number.isNaN(d.getTime())
                            ? toDateString(d)
                            : "",
                        )
                      }
                      slotProps={{
                        textField: {
                          size: "small",
                          required: true,
                          error: Boolean(typedProblem || endIssue),
                          helperText:
                            typedProblem ||
                            endIssue ||
                            (startDate
                              ? `By ${formatDate(shortTermLatestEnd(startDate))} at the latest`
                              : undefined),
                          sx: { maxWidth: 260 },
                        },
                      }}
                    />
                  )}
                />
                {!expansion ? (
                  <Typography variant="body2" color="text.secondary">
                    A term under a year needs approval.
                  </Typography>
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          // Never hidden without a reason: the duration depends on the products below (2026-10-12).
          <Typography variant="body2" color="text.secondary">
            {termNote(lines)}
          </Typography>
        )}
      </Stack>
    </SectionCard>
  );
}
