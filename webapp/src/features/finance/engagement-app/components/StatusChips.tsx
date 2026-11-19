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

// Chips for real statuses only: request, engagement, allocation, travel, invoice, payment, NetSuite and document status.

import type { JSX } from "react";
import { Box, Typography } from "@wso2/oxygen-ui";
import { StatusChip } from "@features/finance/components/FinanceChips";
import type {
  AllocationStatus,
  EngagementStatus,
  Invoice,
  NetSuiteState,
  RequestStatus,
  TravelStatus,
} from "../api/engagementTypes";
import {
  allocationTone,
  engagementTone,
  financeApproval,
  invoiceTone,
  poApproval,
  requestTone,
  travelTone,
  type ChipTone,
} from "../model/statuses";
import { expiresIn } from "../model/format";

export const Status = ({ label, tone }: { label: string; tone: ChipTone }): JSX.Element => (
  <StatusChip label={label} color={tone} />
);

export const RequestStatusChip = ({ status }: { status: RequestStatus }) => <Status label={status} tone={requestTone(status)} />;
export const EngagementStatusChip = ({ status }: { status: EngagementStatus }) => (
  <Status label={status} tone={engagementTone(status)} />
);
export const AllocationStatusChip = ({ status }: { status: AllocationStatus }) => (
  <Status label={status} tone={allocationTone(status)} />
);
export const TravelStatusChip = ({ status }: { status: TravelStatus }) => <Status label={status} tone={travelTone(status)} />;
export const InvoiceStatusChip = ({ invoice }: { invoice: Pick<Invoice, "status"> }) => (
  <Status label={invoice.status} tone={invoiceTone(invoice.status)} />
);

export function PoApprovalChip({ invoice }: { invoice: Pick<Invoice, "status" | "rejectReason"> }): JSX.Element {
  const s = poApproval(invoice);
  return (
    <Box>
      <Status label={s.label} tone={s.tone} />
      {invoice.status === "Rejected by travel" && invoice.rejectReason ? <Sub>Rejected Reason: {invoice.rejectReason}</Sub> : null}
    </Box>
  );
}

export function FinanceApprovalChip({ invoice }: { invoice: Pick<Invoice, "status" | "rejectReason"> }): JSX.Element {
  const s = financeApproval(invoice);
  return (
    <Box>
      <Status label={s.label} tone={s.tone} />
      {invoice.status === "Rejected by finance" && invoice.rejectReason ? <Sub>Rejected Reason: {invoice.rejectReason}</Sub> : null}
    </Box>
  );
}

/** NS Status keeps the legacy values; a push whose status did not come back shows NetSuite's message under Pending. */
export function NsStatusChip({ record }: { record: NetSuiteState }): JSX.Element {
  return (
    <Box>
      <Status label={record.nsStatus} tone={record.nsStatus === "Pushed" ? "success" : record.nsStatus === "Pushing" ? "info" : "warning"} />
      {record.nsReference ? <Sub mono>{record.nsReference}</Sub> : null}
      {!record.nsReference && record.nsError ? (
        <Typography variant="caption" component="div" sx={{ color: "warning.dark", mt: 0.25 }}>
          {record.nsError}
        </Typography>
      ) : null}
    </Box>
  );
}

export const DocumentStatusChip = ({ status }: { status: "Active" | "Expired" | "Inactive" }) => (
  <Status label={status} tone={status === "Active" ? "success" : status === "Expired" ? "error" : "default"} />
);

/** Plain text; Expired is the one chip, and anything ending within three months is in the warning colour. */
export function ExpiresIn({ end, today }: { end: string | undefined; today: string }): JSX.Element {
  const e = expiresIn(end, today);
  if (e.expired) return <Status label="Expired" tone="error" />;
  return (
    <Typography variant="body2" sx={{ fontSize: 13, color: e.soon ? "warning.dark" : end ? "text.primary" : "text.secondary" }}>
      {e.label}
    </Typography>
  );
}

/** A secondary line under a table cell's main value. */
export function Sub({ children, mono = false }: { children: React.ReactNode; mono?: boolean }): JSX.Element {
  return (
    <Typography
      variant="caption"
      component="div"
      color="text.secondary"
      sx={{ mt: 0.25, lineHeight: 1.4, whiteSpace: "pre-line", ...(mono ? { fontFamily: "monospace" } : {}), overflowWrap: "break-word" }}
    >
      {children}
    </Typography>
  );
}

/** Every ID, code and record number. */
export function Mono({ children, bold = false }: { children: React.ReactNode; bold?: boolean }): JSX.Element {
  return (
    <Box component="span" sx={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: bold ? 700 : undefined, whiteSpace: "nowrap" }}>
      {children}
    </Box>
  );
}

/** A value with an optional secondary line under it. */
export function Two({ main, sub, mono = false }: { main: React.ReactNode; sub?: React.ReactNode; mono?: boolean }): JSX.Element {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ fontSize: 13, overflowWrap: "break-word", ...(mono ? { fontFamily: "monospace", fontSize: 12.5 } : {}) }}>{main}</Box>
      {sub && sub !== main ? <Sub>{sub}</Sub> : null}
    </Box>
  );
}
