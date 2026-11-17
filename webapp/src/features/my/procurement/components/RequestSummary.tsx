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

import { useState, type ReactNode } from "react";
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@wso2/oxygen-ui";
import { formatBytes, formatDate } from "../procurementFormat";
import type { BudgetDetails, Person, RequestCategory, RequestDetails, Vendor, YesNo } from "../types";

/** A file attached to the request, as a summary lists it. */
export interface SummaryAttachment {
  name: string;
  sizeBytes: number;
}

/** Everything a summary shows, whether it comes from a draft in the form or a saved request. */
export interface RequestView {
  category: RequestCategory | "";
  requester: Person;
  teamLead: Person | null;
  /** Emails of the people who may approve besides the team lead. */
  additionalApprovers: string[];
  details: RequestDetails;
  vendors: Vendor[];
  /** Each value is what a person reads (a label), not a code. */
  budget: BudgetDetails;
  /** The budget approver's name. */
  budgetApprover: string;
  notes: string;
  attachments: SummaryAttachment[];
  /** A date to show with the key facts, with what it is called ("Date", "Raised"). */
  date?: { label: string; iso: string };
}

const CATEGORY_LABEL: Record<RequestCategory, string> = {
  IT: "IT Related Procurement",
  "NON-IT": "Non-IT Related Procurement",
  EVENTS: "Marketing & Events Procurement",
};

const CATEGORY_SHORT: Record<RequestCategory, string> = {
  IT: "IT request",
  "NON-IT": "Non-IT request",
  EVENTS: "Marketing & Events request",
};

/** Text longer than this, or with more lines than the clamp, is cut with a Show more. */
const CLAMP_CHARS = 240;
const CLAMP_LINES = 3;

const yesNo = (value: YesNo | ""): string => (value === "yes" ? "Yes" : value === "no" ? "No" : "");
const joined = (...parts: string[]): string => parts.map((p) => p.trim()).filter(Boolean).join(", ");

function ClampedText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > CLAMP_CHARS || text.split("\n").length > CLAMP_LINES;
  const clamp = long && !open;
  return (
    <>
      <Typography
        variant="body2"
        sx={{
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          ...(clamp ? { display: "-webkit-box", WebkitLineClamp: CLAMP_LINES, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}),
        }}
      >
        {text}
      </Typography>
      {long && (
        <Button size="small" onClick={() => setOpen(!open)} sx={{ px: 0, minWidth: 0 }}>
          {open ? "Show less" : "Show more"}
        </Button>
      )}
    </>
  );
}

/**
 * One label and its value. An empty required value is left out; an empty
 * optional one reads "Not provided", so a skipped field can be told from a lost one.
 */
function Row({
  label,
  value = "",
  optional = false,
  children,
}: {
  label: string;
  value?: string;
  optional?: boolean;
  children?: ReactNode;
}) {
  if (!children && value === "" && !optional) return null;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "240px 1fr" }, gap: { xs: 0, sm: 2 }, py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        {children ||
          (value === "" ? (
            <Typography variant="body2" color="text.disabled">
              Not provided
            </Typography>
          ) : (
            <ClampedText text={value} />
          ))}
      </Box>
    </Box>
  );
}

function Section({ title, onEdit, children }: { title: string; onEdit?: () => void; children: ReactNode }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {onEdit && (
            <Button size="small" onClick={onEdit} aria-label={`Edit ${title}`}>
              Edit
            </Button>
          )}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function ItRows({ d }: { d: RequestDetails }) {
  return (
    <>
      <Row label="Product / solution name" value={d.product} />
      <Row label="Plan / subscription tier" value={d.plan} />
      <Row label="Description of the product / solution" value={d.description} />
      <Row label="Users" value={joined(d.userCount, d.userNames.join(", "))} optional />
      <Row label="Administrators" value={joined(d.adminCount, d.adminNames.join(", "))} optional />
      <Row label="Expected usage period" value={d.usagePeriod} />
      <Row label="Business justification" value={d.businessJustification} />
      <Row label="ROI" value={d.roi} optional />
      <Row label="Stores sensitive WSO2 data" value={yesNo(d.sensitiveData)} />
      {d.sensitiveData === "yes" && <Row label="Sensitive data" value={d.sensitiveDataDetail} />}
      <Row label="Stores external PII" value={yesNo(d.externalPii)} />
      {d.externalPii === "yes" && <Row label="External PII" value={d.externalPiiDetail} />}
      <Row label="Stores employee PII" value={yesNo(d.employeePii)} />
      {d.employeePii === "yes" && <Row label="Employee PII" value={d.employeePiiDetail} />}
      <Row label="Integrates with WSO2 systems" value={yesNo(d.integrates)} />
      {d.integrates === "yes" && (
        <>
          <Row label="Integrations" value={d.integrations.map((i) => joined(i.system, i.data)).join("\n")} />
          <Row label="Vendor documentation" value={yesNo(d.vendorDocs)} />
          {d.vendorDocs === "yes" && <Row label="Documentation link(s)" value={d.vendorDocsLink} />}
        </>
      )}
    </>
  );
}

function NonItRows({ d }: { d: RequestDetails }) {
  return (
    <>
      <Row label="Details of goods / services required" value={d.description} />
      <Row label="Additional specifications or document links" value={d.specifications} optional />
      <Row label="Business justification" value={d.businessJustification} />
      <Row label="ROI" value={d.roi} optional />
    </>
  );
}

function AttachmentList({ attachments }: { attachments: SummaryAttachment[] }) {
  return (
    <Stack spacing={1}>
      {attachments.map((file, index) => (
        <Stack key={`${file.name}-${index}`} direction="row" spacing={1.5} alignItems="center">
          <Box
            aria-hidden="true"
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              bgcolor: "action.hover",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            {(file.name.split(".").pop() ?? "").slice(0, 4).toUpperCase()}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
              {file.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatBytes(file.sizeBytes)}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

/**
 * Read-only layout of a request. Its cards follow the form's steps, so a
 * reviewer finds each answer where it was given.
 *
 * @param onEditStep - When given, each card offers Edit and calls it with the form step that holds it
 */
export default function RequestSummary({
  view,
  onEditStep,
}: {
  view: RequestView;
  onEditStep?: (step: number) => void;
}) {
  const edit = (step: number) => (onEditStep ? () => onEditStep(step) : undefined);
  const { budget: b } = view;
  // Budget details are required for Non-IT only; for IT a blank one was skipped on purpose.
  const budgetOptional = view.category !== "NON-IT";
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
        {view.category && <Chip size="small" color="primary" variant="outlined" label={CATEGORY_SHORT[view.category]} />}
        {view.teamLead && <Chip size="small" variant="outlined" label={`Team lead: ${view.teamLead.name}`} />}
        {view.date && <Chip size="small" variant="outlined" label={`${view.date.label} ${formatDate(view.date.iso)}`} />}
      </Stack>

      <Section title="Requester" onEdit={edit(1)}>
        <Row label="Requester" value={view.requester.name} />
        <Row label="Email" value={view.requester.email} />
        <Row label="Team lead (for approval)" value={view.teamLead ? joined(view.teamLead.name, view.teamLead.email) : ""} optional />
        <Row label="Additional approvers" value={view.additionalApprovers.join("\n")} optional />
      </Section>

      <Section title="Requirement details" onEdit={edit(3)}>
        <Row label="Procurement category" value={view.category ? CATEGORY_LABEL[view.category] : ""} />
        {view.category === "IT" && <ItRows d={view.details} />}
        {view.category === "NON-IT" && <NonItRows d={view.details} />}
      </Section>

      <Section title="Vendors" onEdit={edit(4)}>
        {view.vendors.length === 0 ? (
          <Row label="Proposed vendor" optional />
        ) : (
          view.vendors.map((v, index) => (
            <Row
              key={index}
              label={view.vendors.length > 1 ? `Proposed vendor ${index + 1}` : "Proposed vendor"}
              value={[joined(v.name, v.website), joined(v.contact, v.email, v.phone)].filter(Boolean).join("\n")}
            />
          ))
        )}
      </Section>

      <Section title="Budget" onEdit={edit(4)}>
        <Row label="Budget category" value={b.category} optional={budgetOptional} />
        <Row label="Business unit" value={b.businessUnit} optional={budgetOptional} />
        <Row label="Product" value={b.product} optional={budgetOptional} />
        <Row label="Region" value={b.region} optional={budgetOptional} />
        <Row label="Engagement code" value={b.engagementCode} optional={budgetOptional} />
        <Row label="Salesforce campaign" value={b.salesforceCampaign} optional />
        <Row label="Budget approver" value={view.budgetApprover} optional={budgetOptional} />
      </Section>

      <Section title="Documents and notes" onEdit={edit(4)}>
        <Row label="Attachments" optional={view.attachments.length === 0}>
          {view.attachments.length > 0 && <AttachmentList attachments={view.attachments} />}
        </Row>
        <Row label="Notes for Procurement" value={view.notes} optional />
      </Section>
    </Stack>
  );
}
