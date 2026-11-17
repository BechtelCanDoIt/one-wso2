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

import { Box, Button, Checkbox, FormControlLabel, IconButton, Stack } from "@wso2/oxygen-ui";
import { PlusIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import type { RequestDetails } from "../types";
import { ChipsField, SectionHeading, SelectField, StepTitle, TextInput, YesNoField, YesNoList } from "./formFields";
import { detailsLabel, INSTALLATION_TYPES, LICENSE_TYPES, USAGE_PERIODS, type RequestDraft } from "./requestFormModel";

interface DetailsProps {
  details: RequestDetails;
  onChange: (patch: Partial<RequestDetails>) => void;
}

const TWO_COLUMNS = { display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } } as const;

const labelsOf = (choices: readonly { value: string; label: string }[]) => Object.fromEntries(choices.map((c) => [c.value, c.label]));
const INSTALLATION_LABELS = labelsOf(INSTALLATION_TYPES);
const LICENSE_LABELS = labelsOf(LICENSE_TYPES);

const ROI_IT = "e.g. Replaces two tools (USD 18k/yr), saves ~10 hrs/week for the Sales team; payback within 6 months";
const ROI_NON_IT = "e.g. Cuts annual facilities cost by 15%; pays back within the year";

function Justification({ details, onChange, roiPlaceholder }: Pick<DetailsProps, "details" | "onChange"> & { roiPlaceholder: string }) {
  return (
    <>
      <SectionHeading>Justification</SectionHeading>
      <TextInput
        required
        multiline
        minRows={3}
        label="Business justification"
        placeholder="Why is this purchase needed? What problem does it solve, and what happens if we don't buy it?"
        value={details.businessJustification}
        onChange={(businessJustification) => onChange({ businessJustification })}
      />
      <TextInput multiline minRows={2} label="ROI" placeholder={roiPlaceholder} value={details.roi} onChange={(roi) => onChange({ roi })} />
    </>
  );
}

function Assessment({ details, onChange }: Pick<DetailsProps, "details" | "onChange">) {
  const d = details;
  const setIntegration = (index: number, patch: Partial<{ system: string; data: string }>) =>
    onChange({ integrations: d.integrations.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  const removeIntegration = (index: number) =>
    onChange({ integrations: d.integrations.length <= 1 ? [{ system: "", data: "" }] : d.integrations.filter((_, i) => i !== index) });

  return (
    <>
      <SectionHeading>Data &amp; security assessment</SectionHeading>
      <YesNoList>
        <YesNoField
          label="Will this platform store or process sensitive or confidential WSO2 data?"
          value={d.sensitiveData}
          onChange={(v) => onChange({ sensitiveData: v })}
        >
          <TextInput
            required
            multiline
            minRows={2}
            label="What sensitive or confidential WSO2 data will it store or process?"
            placeholder="e.g. source code, financial reports, customer contracts, pricing"
            value={d.sensitiveDataDetail}
            onChange={(sensitiveDataDetail) => onChange({ sensitiveDataDetail })}
          />
        </YesNoField>
        <YesNoField
          label="Will this platform store or process external PII (customers, prospects, leads, or third parties)?"
          value={d.externalPii}
          onChange={(v) => onChange({ externalPii: v })}
        >
          <TextInput
            required
            multiline
            minRows={2}
            label="What data would this include?"
            placeholder="e.g. names, emails, phone numbers, payment details"
            value={d.externalPiiDetail}
            onChange={(externalPiiDetail) => onChange({ externalPiiDetail })}
          />
        </YesNoField>
        <YesNoField
          label="Will this platform store or process internal employee PII?"
          value={d.employeePii}
          onChange={(v) => onChange({ employeePii: v })}
        >
          <TextInput
            required
            multiline
            minRows={2}
            label="What data would this include?"
            placeholder="e.g. employee ID, payroll data, performance records"
            value={d.employeePiiDetail}
            onChange={(employeePiiDetail) => onChange({ employeePiiDetail })}
          />
        </YesNoField>
        <YesNoField
          label="Will this integrate with WSO2 internal systems?"
          value={d.integrates}
          onChange={(v) => onChange({ integrates: v })}
        >
          {d.integrations.map((row, index) => (
            <Box key={index} sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
              <Box sx={{ ...TWO_COLUMNS, flex: 1, minWidth: 0 }}>
                <TextInput
                  required={index === 0}
                  label="WSO2 system"
                  placeholder="e.g. Google Workspace, Salesforce, WSO2 IS"
                  value={row.system}
                  onChange={(system) => setIntegration(index, { system })}
                />
                <TextInput
                  label="Data / integration details"
                  placeholder="e.g. SSO login; syncs contacts nightly via API"
                  value={row.data}
                  onChange={(data) => setIntegration(index, { data })}
                />
              </Box>
              <IconButton size="small" aria-label={`Remove integration ${index + 1}`} onClick={() => removeIntegration(index)}>
                <XIcon size={16} />
              </IconButton>
            </Box>
          ))}
          <Button
            size="small"
            startIcon={<PlusIcon size={16} />}
            onClick={() => onChange({ integrations: [...d.integrations, { system: "", data: "" }] })}
            sx={{ alignSelf: "flex-start" }}
          >
            Add another integration
          </Button>
          <YesNoField
            bare
            label="Has the vendor provided guidelines / documentation on this integration?"
            value={d.vendorDocs}
            onChange={(v) => onChange({ vendorDocs: v })}
          >
            <TextInput
              required
              label="Documentation link(s)"
              placeholder="Paste link(s), separated by commas"
              value={d.vendorDocsLink}
              onChange={(vendorDocsLink) => onChange({ vendorDocsLink })}
            />
          </YesNoField>
        </YesNoField>
      </YesNoList>
    </>
  );
}

function ItDetails({ details, onChange }: DetailsProps) {
  const d = details;
  const saas = d.installationType === "SAAS";
  return (
    <Stack spacing={2.5}>
      <SectionHeading first>Product</SectionHeading>
      <Box sx={TWO_COLUMNS}>
        <TextInput required label="Product / solution name" placeholder="e.g. Salesforce, GitHub Enterprise" value={d.product} onChange={(product) => onChange({ product })} />
        <TextInput required label="Plan / subscription tier" placeholder="e.g. Enterprise, Pro" value={d.plan} onChange={(plan) => onChange({ plan })} />
      </Box>
      <TextInput required multiline minRows={3} label="Description of the product / solution" placeholder="What does it do, and how will WSO2 use it?" value={d.description} onChange={(description) => onChange({ description })} />
      <Box sx={TWO_COLUMNS}>
        <SelectField
          required
          label="Installation type"
          options={INSTALLATION_TYPES.map((c) => c.value)}
          labels={INSTALLATION_LABELS}
          value={d.installationType}
          onChange={(installationType) => onChange({ installationType: installationType as RequestDetails["installationType"] })}
        />
        <SelectField
          required
          label="Licence type"
          options={LICENSE_TYPES.map((c) => c.value)}
          labels={LICENSE_LABELS}
          value={d.licenseType}
          onChange={(licenseType) => onChange({ licenseType: licenseType as RequestDetails["licenseType"] })}
        />
      </Box>

      <SectionHeading>Links</SectionHeading>
      <Box sx={TWO_COLUMNS}>
        <TextInput required label="Software link" placeholder="https://" value={d.softwareUrl} onChange={(softwareUrl) => onChange({ softwareUrl })} />
        <TextInput required label="Pricing link" placeholder="https://" value={d.pricingUrl} onChange={(pricingUrl) => onChange({ pricingUrl })} />
        <TextInput required label="Terms of service link" placeholder="https://" value={d.termsUrl} onChange={(termsUrl) => onChange({ termsUrl })} />
        <TextInput required label="Privacy policy link" placeholder="https://" value={d.privacyUrl} onChange={(privacyUrl) => onChange({ privacyUrl })} />
        <TextInput required label="Security / compliance link" placeholder="https://" value={d.securityUrl} onChange={(securityUrl) => onChange({ securityUrl })} />
      </Box>

      <SectionHeading>Usage</SectionHeading>
      <SelectField required label="Expected usage period" placeholder="Select duration" options={USAGE_PERIODS} value={d.usagePeriod} onChange={(usagePeriod) => onChange({ usagePeriod })} />
      <YesNoList>
        <YesNoField label="Is this request urgent?" value={d.urgent} onChange={(urgent) => onChange({ urgent })}>
          <TextInput required multiline minRows={2} label="Why is it urgent?" value={d.urgencyJustification} onChange={(urgencyJustification) => onChange({ urgencyJustification })} />
        </YesNoField>
      </YesNoList>

      {saas && (
        <>
          <SectionHeading>Users</SectionHeading>
          <Box sx={TWO_COLUMNS}>
            <Stack spacing={2.5}>
              <TextInput required type="number" label="Number of users" placeholder="e.g. 25" value={d.userCount} onChange={(userCount) => onChange({ userCount })} />
              <ChipsField required label="User names" placeholder="e.g. Jane Silva, Sales team" values={d.userNames} onChange={(userNames) => onChange({ userNames })} />
            </Stack>
            <Stack spacing={2.5}>
              <TextInput required type="number" label="Number of administrators" placeholder="e.g. 2" value={d.adminCount} onChange={(adminCount) => onChange({ adminCount })} />
              <ChipsField required label="Administrator names" placeholder="e.g. John Perera" values={d.adminNames} onChange={(adminNames) => onChange({ adminNames })} />
            </Stack>
          </Box>
        </>
      )}

      <Justification details={d} onChange={onChange} roiPlaceholder={ROI_IT} />
      {saas && <Assessment details={d} onChange={onChange} />}

      <SectionHeading>Confirmations</SectionHeading>
      <Stack>
        <FormControlLabel
          required
          control={<Checkbox checked={d.authorizedListChecked} onChange={(e) => onChange({ authorizedListChecked: e.target.checked })} />}
          label="I have checked that this software is not already on the authorised software list."
        />
        <FormControlLabel
          required
          control={<Checkbox checked={d.legitimacyConfirmed} onChange={(e) => onChange({ legitimacyConfirmed: e.target.checked })} />}
          label="I confirm that the vendor and the software are legitimate."
        />
      </Stack>
    </Stack>
  );
}

function NonItDetails({ details, onChange }: Pick<DetailsProps, "details" | "onChange">) {
  return (
    <Stack spacing={2.5}>
      <SectionHeading first>Goods or services</SectionHeading>
      <TextInput required multiline minRows={3} label="Details of goods / services required" placeholder="Describe what's needed, including quantities, e.g. 40 ergonomic office chairs for the Colombo office" value={details.description} onChange={(description) => onChange({ description })} />
      <TextInput multiline minRows={2} label="Additional specifications or document links" placeholder="Any additional specifications, or links to spec sheets / vendor quotes, if available" value={details.specifications} onChange={(specifications) => onChange({ specifications })} />
      <Justification details={details} onChange={onChange} roiPlaceholder={ROI_NON_IT} />
    </Stack>
  );
}

// Step 3. The questions that belong to the chosen category.
export default function DetailsStep({
  draft,
  onChange,
}: {
  draft: RequestDraft;
  onChange: (patch: Partial<RequestDetails>) => void;
}) {
  return (
    <Stack spacing={3} sx={{ py: 1 }}>
      <StepTitle>{detailsLabel(draft.category)}</StepTitle>
      {draft.category === "IT" ? (
        <ItDetails details={draft.details} onChange={onChange} />
      ) : (
        <NonItDetails details={draft.details} onChange={onChange} />
      )}
    </Stack>
  );
}
