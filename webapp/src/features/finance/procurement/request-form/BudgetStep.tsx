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

import { useState, type ChangeEvent } from "react";
import { Alert, Box, Button, IconButton, Stack, Typography } from "@wso2/oxygen-ui";
import { PlusIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import type { BudgetDetails, ProcurementLookups, Vendor } from "../types";
import { OptionField, SectionHeading, SelectField, StepTitle, TextInput } from "./formFields";
import { attachmentProblem, emptyVendor, MAX_ATTACHMENTS, type RequestDraft } from "./requestFormModel";

const TWO_COLUMNS = { display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } } as const;
const THREE_COLUMNS = { display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } } as const;

function VendorBlock({
  vendor,
  index,
  total,
  removable,
  onChange,
  onRemove,
}: {
  vendor: Vendor;
  index: number;
  total: number;
  removable: boolean;
  onChange: (patch: Partial<Vendor>) => void;
  onRemove: () => void;
}) {
  return (
    <Stack spacing={2.5} sx={{ p: 2.5, border: 1, borderColor: "divider", borderRadius: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">{total > 1 ? `Proposed vendor ${index + 1}` : "Proposed vendor"}</Typography>
        {removable && (
          <IconButton size="small" aria-label={`Remove vendor ${index + 1}`} onClick={onRemove}>
            <XIcon size={16} />
          </IconButton>
        )}
      </Stack>
      <Box sx={TWO_COLUMNS}>
        <TextInput label="Vendor name (if known)" value={vendor.name} onChange={(name) => onChange({ name })} />
        <TextInput label="Vendor website" placeholder="e.g. https://www.supplier.com" value={vendor.website} onChange={(website) => onChange({ website })} />
      </Box>
      <Box sx={THREE_COLUMNS}>
        <TextInput label="Contact name" value={vendor.contact} onChange={(contact) => onChange({ contact })} />
        <TextInput type="email" label="Contact email" value={vendor.email} onChange={(email) => onChange({ email })} />
        <TextInput label="Contact number" value={vendor.phone} onChange={(phone) => onChange({ phone })} />
      </Box>
    </Stack>
  );
}

function Attachments({ files, onFiles }: { files: File[]; onFiles: (files: File[]) => void }) {
  const [problem, setProblem] = useState<string | null>(null);
  const add = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    const bad = picked.map(attachmentProblem).find((p) => p !== null) ?? null;
    if (bad) return setProblem(bad);
    if (files.length + picked.length > MAX_ATTACHMENTS) return setProblem(`Attach at most ${MAX_ATTACHMENTS} files.`);
    setProblem(null);
    onFiles([...files, ...picked]);
  };
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        Attach proposal, quotation, or supporting documents
      </Typography>
      <Button component="label" size="small" variant="outlined" sx={{ alignSelf: "flex-start" }}>
        Choose files
        <input hidden multiple type="file" onChange={add} />
      </Button>
      {problem && <Alert severity="error">{problem}</Alert>}
      {files.map((file, index) => (
        <Stack key={`${file.name}-${index}`} direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
            {file.name}
          </Typography>
          <IconButton size="small" aria-label={`Remove ${file.name}`} onClick={() => onFiles(files.filter((_, i) => i !== index))}>
            <XIcon size={14} />
          </IconButton>
        </Stack>
      ))}
    </Stack>
  );
}

// Step 4. The proposed vendors, supporting documents, budget and who approves it.
export default function BudgetStep({
  draft,
  lookups,
  files,
  onFiles,
  onChange,
}: {
  draft: RequestDraft;
  lookups: ProcurementLookups;
  files: File[];
  onFiles: (files: File[]) => void;
  onChange: (patch: Partial<RequestDraft>) => void;
}) {
  const required = draft.category === "NON-IT";
  const setBudget = (patch: Partial<BudgetDetails>) => onChange({ budget: { ...draft.budget, ...patch } });
  const setVendor = (index: number, patch: Partial<Vendor>) =>
    onChange({ vendors: draft.vendors.map((v, i) => (i === index ? { ...v, ...patch } : v)) });
  const setApprover = (index: number, email: string) =>
    onChange({ budgetApproverEmails: draft.budgetApproverEmails.map((e, i) => (i === index ? email : e)) });
  const b = draft.budget;
  const approverEmails = lookups.budgetApprovers.map((p) => p.email);
  const approverLabels = Object.fromEntries(lookups.budgetApprovers.map((p) => [p.email, `${p.name} (${p.email})`]));

  return (
    <Stack spacing={2.5} sx={{ py: 1 }}>
      <StepTitle>Vendor &amp; budget</StepTitle>

      <SectionHeading first>Vendors</SectionHeading>
      {draft.vendors.map((vendor, index) => (
        <VendorBlock
          key={index}
          vendor={vendor}
          index={index}
          total={draft.vendors.length}
          removable={draft.vendors.length > 1}
          onChange={(patch) => setVendor(index, patch)}
          onRemove={() => onChange({ vendors: draft.vendors.filter((_, i) => i !== index) })}
        />
      ))}
      <Button size="small" startIcon={<PlusIcon size={16} />} onClick={() => onChange({ vendors: [...draft.vendors, emptyVendor()] })} sx={{ alignSelf: "flex-start" }}>
        Add another vendor
      </Button>

      <SectionHeading>Documents</SectionHeading>
      <Attachments files={files} onFiles={onFiles} />

      <SectionHeading>Budget details</SectionHeading>
      <Box sx={THREE_COLUMNS}>
        <OptionField label="Budget category" required={required} options={lookups.budgetCategories} value={b.category} onChange={(category) => setBudget({ category })} />
        <OptionField label="Business unit" required={required} options={lookups.businessUnits} value={b.businessUnit} onChange={(businessUnit) => setBudget({ businessUnit })} />
        <OptionField label="Product" required={required} options={lookups.products} value={b.product} onChange={(product) => setBudget({ product })} />
        <OptionField label="Region" required={required} options={lookups.regions} value={b.region} onChange={(region) => setBudget({ region })} />
        <OptionField label="Engagement code" required={required} placeholder="e.g. ENG-1001" options={lookups.engagementCodes} value={b.engagementCode} onChange={(engagementCode) => setBudget({ engagementCode })} />
        <TextInput label="Salesforce campaign name (if applicable)" value={b.salesforceCampaign} onChange={(salesforceCampaign) => setBudget({ salesforceCampaign })} />
      </Box>

      <SectionHeading>Budget approval</SectionHeading>
      {draft.budgetApproverEmails.map((email, index) => (
        <Box key={index} sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <SelectField
              required={index === 0}
              label={draft.budgetApproverEmails.length > 1 ? `Budget approver ${index + 1}` : "Budget approver"}
              placeholder="Select approver"
              options={approverEmails}
              labels={approverLabels}
              value={email}
              onChange={(next) => setApprover(index, next)}
            />
          </Box>
          {draft.budgetApproverEmails.length > 1 && (
            <IconButton size="small" aria-label={`Remove budget approver ${index + 1}`} onClick={() => onChange({ budgetApproverEmails: draft.budgetApproverEmails.filter((_, i) => i !== index) })}>
              <XIcon size={16} />
            </IconButton>
          )}
        </Box>
      ))}
      <Button size="small" startIcon={<PlusIcon size={16} />} onClick={() => onChange({ budgetApproverEmails: [...draft.budgetApproverEmails, ""] })} sx={{ alignSelf: "flex-start" }}>
        Add another budget approver
      </Button>

      <SectionHeading>Notes</SectionHeading>
      <TextInput
        multiline
        minRows={3}
        label="Notes for the Procurement team"
        placeholder="Anything else Procurement should know: deadlines, existing quotes, contract references…"
        value={draft.notes}
        onChange={(notes) => onChange({ notes })}
      />
    </Stack>
  );
}
