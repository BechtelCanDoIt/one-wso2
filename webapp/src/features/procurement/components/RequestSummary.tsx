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
import { EVENT_COSTS, EVENT_TYPES, INSTALLATION_TYPES, PACKAGE_INCLUSIONS, totalInvestment } from "../request-form/requestFormModel";
import { formatDate } from "../procurementFormat";
import type { BudgetDetails, EventDetails, Person, RequestCategory, RequestDetails, Vendor, YesNo } from "../types";

/** Everything a summary shows, whether it comes from a draft in the form or a saved request. */
export interface RequestView {
  category: RequestCategory | "";
  requester: Person;
  teamLead: Person | null;
  /** Emails of the people who may approve besides the team lead. */
  additionalApprovers: string[];
  details: RequestDetails;
  event: EventDetails;
  vendors: Vendor[];
  /** Each value is what a person reads (a label), not a code. */
  budget: BudgetDetails;
  /** The budget approver's name. */
  budgetApprover: string;
  notes: string;
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

const choiceLabel = (choices: readonly { value: string; label: string }[], value: string): string =>
  choices.find((c) => c.value === value)?.label ?? value;

function ItRows({ d }: { d: RequestDetails }) {
  return (
    <>
      <Row label="Product / solution name" value={d.product} />
      <Row label="Plan / subscription tier" value={d.plan} />
      <Row label="Description of the product / solution" value={d.description} />
      <Row label="Requirement to use this software" value={d.softwareRequirement} />
      <Row label="Installation type" value={choiceLabel(INSTALLATION_TYPES, d.installationType)} />
      <Row label="Expected usage period" value={d.usagePeriod} />
      <Row label="Users" value={joined(d.userCount, d.userNames.join(", "))} />
      <Row label="Administrators" value={joined(d.adminCount, d.adminNames.join(", "))} />
      <Row label="External parties interact with it" value={yesNo(d.externalInteraction)} />
      <Row label="Business justification" value={d.businessJustification} />
      <Row label="ROI" value={d.roi} optional />
      <Row label="Stores sensitive Choreo Labs data" value={yesNo(d.sensitiveData)} />
      {d.sensitiveData === "yes" && <Row label="Sensitive data" value={d.sensitiveDataDetail} />}
      <Row label="Stores external PII" value={yesNo(d.externalPii)} />
      {d.externalPii === "yes" && <Row label="External PII" value={d.externalPiiDetail} />}
      <Row label="Stores employee PII" value={yesNo(d.employeePii)} />
      {d.employeePii === "yes" && <Row label="Employee PII" value={d.employeePiiDetail} />}
      <Row label="Integrates with Choreo Labs systems" value={yesNo(d.integrates)} />
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

const usd = (amount: number): string => amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
const amountOf = (value: string): string => (value.trim() === "" ? "" : usd(Number(value)));

function EventRows({ e }: { e: EventDetails }) {
  const industry = e.eventType === "INDUSTRY_EVENT_SPONSORSHIP";
  const shortlisted = e.shortlisted === "yes";
  return (
    <>
      <Row label="Event type" value={choiceLabel(EVENT_TYPES, e.eventType)} />
      <Row label="On the EVENT_SHORTLIST" value={shortlisted ? joined("Yes", `Line ID ${e.shortlistLineId}`) : yesNo(e.shortlisted)} />
      <Row label="Event name" value={e.name} />
      <Row label="Dates" value={e.startDate && e.endDate ? `${formatDate(e.startDate)} to ${formatDate(e.endDate)}` : ""} />
      <Row label="Main audience" value={e.audience} />
      {industry && (
        <>
          <Row label="Sponsorship package" value={e.packageName} />
          <Row label="Package includes" value={e.packageInclusions.map((i) => choiceLabel(PACKAGE_INCLUSIONS, i)).join(", ")} optional />
          <Row label="Prospectus or contract" value={e.prospectusUrl} optional />
        </>
      )}
      {EVENT_COSTS.filter(({ value }) => e.costs[value].trim() !== "").map(({ value, label }) => (
        <Row key={value} label={label} value={amountOf(e.costs[value])} />
      ))}
      {e.otherCosts
        .filter((c) => c.amount.trim() !== "")
        .map((c, index) => (
          <Row key={index} label={c.description.trim() ? `Other cost: ${c.description.trim()}` : "Other cost"} value={amountOf(c.amount)} />
        ))}
      <Row label="Total investment" value={usd(totalInvestment(e.costs, e.otherCosts))} />
      <Row label="Partner investment" value={e.partnerInvestmentPercent.trim() ? `${e.partnerInvestmentPercent.trim()}%` : "0%"} optional />
      {!shortlisted && (
        <>
          <Row label="Target accounts attending" value={e.targetAccounts} />
          <Row label="Key accounts" value={e.keyAccounts} optional />
          <Row label="New pipeline" value={amountOf(e.newPipeline)} />
          <Row label="ROI calculator" value={e.roiCalculatorUrl} />
        </>
      )}
      {industry && !shortlisted && (
        <>
          <Row label="Attended before" value={yesNo(e.attendedBefore)} />
          {e.attendedBefore === "yes" && (
            <>
              <Row label="Earlier attendance cost" value={amountOf(e.previousCost)} />
              <Row label="Earlier pipeline" value={amountOf(e.previousPipeline)} />
            </>
          )}
        </>
      )}
      {!shortlisted && <Row label="Brand goal" value={e.brandGoal} optional />}
    </>
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
  // Budget details are required for Non-IT and Events; for IT a blank one was skipped on purpose.
  const budgetOptional = view.category === "IT";
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
        {view.category === "EVENTS" && <EventRows e={view.event} />}
      </Section>

      {view.category !== "EVENTS" && (
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
      )}

      <Section title="Budget" onEdit={edit(4)}>
        <Row label="Budget category" value={b.category} optional={budgetOptional} />
        <Row label="Business unit" value={b.businessUnit} optional={budgetOptional} />
        <Row label="Product" value={b.product} optional={budgetOptional} />
        <Row label="Region" value={b.region} optional={budgetOptional} />
        <Row label={view.category === "EVENTS" ? "Engagement code / Budget owner" : "Engagement code"} value={b.engagementCode} optional={budgetOptional} />
        <Row label="Salesforce campaign" value={b.salesforceCampaign} optional />
        {view.category !== "EVENTS" && <Row label="Budget approver" value={view.budgetApprover} optional={budgetOptional} />}
      </Section>

      <Section title="Notes" onEdit={edit(view.category === "EVENTS" ? 3 : 4)}>
        <Row label="Notes for Procurement" value={view.notes} optional />
      </Section>
    </Stack>
  );
}
