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

import { Box, Button, Checkbox, FormControlLabel, IconButton, Stack, Typography } from "@wso2/oxygen-ui";
import { PlusIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import type { AttachmentsDraft, EventDetails, PackageInclusion } from "../types";
import AttachmentsField from "./AttachmentsField";
import { SectionHeading, SelectField, StepTitle, TextInput, YesNoField, YesNoList } from "./formFields";
import { EVENT_COSTS, EVENT_TYPES, PACKAGE_INCLUSIONS, totalInvestment } from "./requestFormModel";

const TWO_COLUMNS = { display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } } as const;
const THREE_COLUMNS = { display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } } as const;

const EVENT_TYPE_LABELS = Object.fromEntries(EVENT_TYPES.map((c) => [c.value, c.label]));

const usd = (amount: number): string => amount.toLocaleString("en-US", { style: "currency", currency: "USD" });

// Step 3 of a Marketing & Events request, one section per question of the questionnaire.
export default function EventDetailsStep({
  event: e,
  notes,
  attachments,
  onChange,
  onNotesChange,
  onAttachmentsChange,
}: {
  event: EventDetails;
  notes: string;
  attachments: AttachmentsDraft;
  onChange: (patch: Partial<EventDetails>) => void;
  onNotesChange: (notes: string) => void;
  onAttachmentsChange: (attachments: AttachmentsDraft) => void;
}) {
  const industry = e.eventType === "INDUSTRY_EVENT_SPONSORSHIP";
  const shortlisted = e.shortlisted === "yes";
  const total = totalInvestment(e.costs, e.otherCosts);
  const setCost = (category: keyof EventDetails["costs"], value: string) => onChange({ costs: { ...e.costs, [category]: value } });
  const setOtherCost = (index: number, patch: Partial<EventDetails["otherCosts"][number]>) =>
    onChange({ otherCosts: e.otherCosts.map((line, i) => (i === index ? { ...line, ...patch } : line)) });
  const removeOtherCost = (index: number) =>
    onChange({ otherCosts: e.otherCosts.length <= 1 ? [{ description: "", amount: "" }] : e.otherCosts.filter((_, i) => i !== index) });
  const partnerShare = Number(e.partnerInvestmentPercent || 0);
  const toggleInclusion = (value: PackageInclusion, on: boolean) =>
    onChange({ packageInclusions: on ? [...e.packageInclusions, value] : e.packageInclusions.filter((i) => i !== value) });
  // Only an industry event sponsorship that is not on the shortlist is asked whether it was attended before.
  const askAttendance = industry && !shortlisted;

  return (
    <Stack spacing={3} sx={{ py: 1 }}>
      <StepTitle>Event details</StepTitle>
      <Stack spacing={2.5}>
        <SectionHeading first>What type of event is this?</SectionHeading>
        <SelectField
          required
          label="Event type" name="eventType"
          options={EVENT_TYPES.map((c) => c.value)}
          labels={EVENT_TYPE_LABELS}
          value={e.eventType}
          onChange={(eventType) => onChange({ eventType: eventType as EventDetails["eventType"] })}
        />

        <SectionHeading>Is this event already approved on the EVENT_SHORTLIST? If yes, what is its Line ID?</SectionHeading>
        <YesNoList>
          <YesNoField label="Already approved on the EVENT_SHORTLIST" name="shortlisted" value={e.shortlisted} onChange={(shortlisted) => onChange({ shortlisted })}>
            <TextInput required label="Line ID" name="shortlistLineId" maxLength={100} value={e.shortlistLineId} onChange={(shortlistLineId) => onChange({ shortlistLineId })} />
          </YesNoField>
        </YesNoList>

        <SectionHeading>What is the event name, its start and end dates, and its main audience?</SectionHeading>
        <TextInput required label="Event name" name="eventName" value={e.name} onChange={(name) => onChange({ name })} />
        <Box sx={TWO_COLUMNS}>
          <TextInput required type="date" label="Start date" name="startDate" value={e.startDate} onChange={(startDate) => onChange({ startDate })} />
          <TextInput required type="date" label="End date" name="endDate" value={e.endDate} onChange={(endDate) => onChange({ endDate })} />
        </Box>
        <TextInput required multiline minRows={2} label="Main audience" name="audience" value={e.audience} onChange={(audience) => onChange({ audience })} />

        {industry && (
          <>
            <SectionHeading>What is the sponsorship package, and what does it include?</SectionHeading>
            <TextInput required label="Package name" name="packageName" placeholder="e.g. Gold sponsor, 6x3m booth" value={e.packageName} onChange={(packageName) => onChange({ packageName })} />
            <Box role="group" aria-label="Includes">
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                Includes
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" } }}>
                {PACKAGE_INCLUSIONS.map(({ value, label }) => (
                  <FormControlLabel
                    key={value}
                    control={<Checkbox size="small" checked={e.packageInclusions.includes(value)} onChange={(ev) => toggleInclusion(value, ev.target.checked)} />}
                    label={label}
                  />
                ))}
              </Box>
            </Box>
            <TextInput type="url" label="Organiser's prospectus or contract (link)" name="prospectusUrl" value={e.prospectusUrl} onChange={(prospectusUrl) => onChange({ prospectusUrl })} />
            <AttachmentsField label="Organiser's prospectus or contract (file)" value={attachments} onChange={onAttachmentsChange} />
          </>
        )}

        <SectionHeading>What is the total investment?</SectionHeading>
        <Box sx={THREE_COLUMNS}>
          {EVENT_COSTS.map(({ value, label }) => (
            <TextInput key={value} type="number" min={0} label={label} name={`cost.${value}`} value={e.costs[value]} onChange={(amount) => setCost(value, amount)} />
          ))}
        </Box>
        <Box role="group" aria-label="Other costs">
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
            Other costs
          </Typography>
          <Stack spacing={1.5}>
            {e.otherCosts.map((line, index) => (
              <Box key={index} sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "2fr 1fr auto" }, alignItems: "start" }}>
                <TextInput label="What it is for" name={`otherCost.${index}.description`} maxLength={300} value={line.description} onChange={(description) => setOtherCost(index, { description })} />
                <TextInput type="number" min={0} label="Amount" name={`otherCost.${index}.amount`} value={line.amount} onChange={(amount) => setOtherCost(index, { amount })} />
                <IconButton size="small" aria-label={`Remove other cost ${index + 1}`} onClick={() => removeOtherCost(index)} sx={{ mt: 1 }}>
                  <XIcon size={16} />
                </IconButton>
              </Box>
            ))}
          </Stack>
          <Button size="small" startIcon={<PlusIcon size={16} />} onClick={() => onChange({ otherCosts: [...e.otherCosts, { description: "", amount: "" }] })} sx={{ mt: 1 }}>
            Add another cost
          </Button>
        </Box>
        <Typography variant="subtitle2" aria-live="polite">
          Total investment: {usd(total)}
        </Typography>
        <TextInput
          type="number"
          min={0}
          label="Partner's share of the investment (%)"
          name="partnerPercent"
          placeholder="0"
          value={e.partnerInvestmentPercent}
          onChange={(partnerInvestmentPercent) => onChange({ partnerInvestmentPercent })}
        />
        {Number.isInteger(partnerShare) && partnerShare >= 0 && partnerShare <= 100 && (
          <Typography variant="body2" aria-live="polite">
            WSO2 investment: {100 - partnerShare}% · Partner investment: {partnerShare}%
          </Typography>
        )}

        {!shortlisted && (
          <>
            <SectionHeading>How many of our target accounts (or the BU's ICP) will attend, and who are the key ones?</SectionHeading>
            <Box sx={TWO_COLUMNS}>
              <TextInput required type="number" min={0} label="Number of target accounts" name="targetAccounts" value={e.targetAccounts} onChange={(targetAccounts) => onChange({ targetAccounts })} />
              <TextInput required={Number(e.targetAccounts) > 0} multiline minRows={2} label="Company names" name="keyAccounts" value={e.keyAccounts} onChange={(keyAccounts) => onChange({ keyAccounts })} />
            </Box>
          </>
        )}

        {!shortlisted && (
          <>
            <SectionHeading>{industry ? "How much new pipeline will the event create? Have we attended this event before?" : "How much new pipeline will the event create?"}</SectionHeading>
            <Box sx={TWO_COLUMNS}>
              <TextInput required type="number" min={0} label="New pipeline" name="newPipeline" value={e.newPipeline} onChange={(newPipeline) => onChange({ newPipeline })} />
              <TextInput required type="url" label="Completed ROI calculator (link)" name="roiCalculatorUrl" value={e.roiCalculatorUrl} onChange={(roiCalculatorUrl) => onChange({ roiCalculatorUrl })} />
            </Box>
          </>
        )}
        {askAttendance && (
          <YesNoList>
            <YesNoField label="Previous attendance" name="attendedBefore" value={e.attendedBefore} onChange={(attendedBefore) => onChange({ attendedBefore })}>
              <Box sx={TWO_COLUMNS}>
                <TextInput required type="number" min={0} label="What it cost" name="previousCost" value={e.previousCost} onChange={(previousCost) => onChange({ previousCost })} />
                <TextInput required type="number" min={0} label="How much pipeline it created (from Salesforce)" name="previousPipeline" value={e.previousPipeline} onChange={(previousPipeline) => onChange({ previousPipeline })} />
              </Box>
            </YesNoField>
          </YesNoList>
        )}

        {!shortlisted && (
          <>
            <SectionHeading>Is there a Brand goal or anything else Procurement should know? (optional)</SectionHeading>
            <TextInput
              multiline
              minRows={2}
              label="Brand goal"
              maxLength={1000}
              placeholder="Why it matters for this event, and what success looks like in one sentence"
              value={e.brandGoal}
              onChange={(brandGoal) => onChange({ brandGoal })}
            />
            <TextInput multiline minRows={2} label="Notes for Procurement" value={notes} onChange={onNotesChange} />
          </>
        )}
      </Stack>
    </Stack>
  );
}
