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
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Alert, Box, DatePickers, Divider, Stack, Tooltip, Typography } from "@wso2/oxygen-ui";
import { CalendarDaysIcon, InfoIcon, LockIcon } from "@wso2/oxygen-ui-icons-react";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import { useAccountOpportunities } from "@features/sales/cado2/quotes/api/useQuoteApi";
import {
  contractEnd,
  durationText,
  endDateFor,
  formatDate,
  parseDateString,
  toDateString,
  type DraftFormValues,
} from "@features/sales/cado2/quotes/form/draftForm";
import { lockedRenewalStart } from "@features/sales/cado2/quotes/form/renewalStart";
import { useFieldIssue } from "@features/sales/cado2/quotes/components/fieldIssues";

const { DatePicker } = DatePickers;

/**
 * Which approval the term's length leads to, if any: under a year for every
 * deal (D85, on the whole term), over 3 years (the extended-term rule).
 */
function approvalHint(start: string, end: string): string {
  if (!start || !end) return "";
  if (end < endDateFor(start, 1)) return "Under 12 months: needs short-term approval";
  if (end > endDateFor(start, 3)) return "Over 3 years: needs extended-term approval";
  return "";
}

/** A read-only fact beside the start date, the field's height: a label above its value. */
function Info({ label, value, help }: { label: string; value: string; help?: string }): JSX.Element {
  return (
    <Box sx={{ minHeight: 40, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, display: "flex", alignItems: "center", gap: 0.5 }}>
        {label}
        {help ? (
          <Tooltip title={help}>
            <Box component="span" tabIndex={0} aria-label={help} sx={{ display: "inline-flex", cursor: "help" }}>
              <InfoIcon size={12} />
            </Box>
          </Tooltip>
        ) : null}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * Step 2's Term card, first on the step: the start date,
 * and where the years the AM added take the term, read-only:
 *
 *   Start date [01/01/2027]   Ends 30 Jun 2029  │  Term 2 years + 6 months
 *
 * The start comes from the opportunity; a renewal's is locked (its own,
 * else the day after the renewed one ends). With neither, the AM enters it.
 * The end is the last year's end: the years below set it.
 */
export default function TermCard(): JSX.Element {
  const { control } = useFormContext<DraftFormValues>();
  const [accountId, opportunityId, isRenewal, previousIds, startDate, yearCount, lastYearEndDate] = useWatch({
    control,
    name: ["accountId", "opportunityId", "isRenewal", "previousOpportunityIds", "startDate", "yearCount", "lastYearEndDate"],
  });
  // A renewal's start: its own opportunity (an open one), else the renewed ones (won).
  const open = useAccountOpportunities(isRenewal && accountId ? accountId : null);
  const won = useAccountOpportunities(isRenewal && accountId ? accountId : null, "won");
  const locked = isRenewal
    ? lockedRenewalStart(
        (open.data ?? []).find((o) => o.id === opportunityId),
        (won.data ?? []).filter((o) => previousIds.includes(o.id)),
      )
    : null;
  const end = contractEnd({ startDate, yearCount, lastYearEndDate });
  const hint = approvalHint(startDate, end);
  const startIssue = useFieldIssue("subscriptionStartDate");

  return (
    <SectionCard title="Term" icon={<CalendarDaysIcon size={18} />}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1.5, md: 3.5 }} alignItems={{ md: "flex-start" }}>
        <Controller
          name="startDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Start date"
              value={parseDateString(field.value)}
              readOnly={Boolean(locked)}
              onChange={(d: Date | null) => field.onChange(d && !Number.isNaN(d.getTime()) ? toDateString(d) : "")}
              slotProps={{
                textField: {
                  size: "small",
                  required: true,
                  error: Boolean(startIssue),
                  helperText:
                    startIssue ??
                    (locked
                      ? locked.source === "OPPORTUNITY"
                        ? "From the opportunity"
                        : `The day after ${locked.fromName || "the renewed opportunity"} ends`
                      : undefined),
                  InputProps: locked ? { endAdornment: <LockIcon size={14} aria-label="Locked" /> } : undefined,
                  sx: { width: 220 },
                },
              }}
            />
          )}
        />
        {/* The end and the length, as information: the years in the Products
            table set them. Each block is the field's height, so all line up. */}
        <Info
          label="Ends"
          value={end ? formatDate(end) : "—"}
          help="One year from the start to begin with. It moves as years are added or deleted in the Products table below, and when the last year is shortened."
        />
        <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" }, my: 0.5 }} />
        <Info label="Term" value={end ? durationText(startDate, end) : "—"} />
      </Stack>
      {hint ? (
        <Typography variant="body2" color="warning.main" sx={{ mt: 1.25 }}>
          {hint}
        </Typography>
      ) : null}
      {isRenewal && !locked && !open.isPending && !won.isPending ? (
        <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
          Salesforce has neither this opportunity&apos;s subscription start date nor the renewed opportunity&apos;s end
          date, so the start date can&apos;t be worked out. Choose it.
        </Alert>
      ) : null}
    </SectionCard>
  );
}
