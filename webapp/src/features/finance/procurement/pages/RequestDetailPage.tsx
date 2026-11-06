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

import { useState } from "react";
import { Link as RouterLink, useParams } from "react-router";
import { Alert, Box, Button, Link, Skeleton, Stack } from "@wso2/oxygen-ui";
import { describeError } from "@api/errors";
import ProcurementShell from "../components/ProcurementShell";
import { RequestStatusChip } from "../components/ProcurementChips";
import RequestSummary from "../components/RequestSummary";
import RequestForm from "../request-form/RequestForm";
import { draftFromRequest } from "../request-form/requestFormModel";
import { useProcurementLookups, useProcurementMe, useRequest, useResubmitRequest } from "../api/useProcurement";
import { formatDate } from "../procurementFormat";
import { procurementPaths } from "../procurementPaths";
import type { PurchaseRequest } from "../types";

function Decision({ request }: { request: PurchaseRequest }) {
  const { decision, notes, decidedAt } = request.teamLeadDecision;
  if (decision === "pending") {
    return <Alert severity="info">Waiting for {request.teamLead.name} to approve or reject this request.</Alert>;
  }
  const approved = decision === "approved";
  return (
    <Alert severity={approved ? "success" : "error"}>
      {approved ? "Approved" : "Rejected"} by {request.teamLead.name}
      {decidedAt ? ` on ${formatDate(decidedAt)}` : ""}.
      {notes && (
        <Box component="span" sx={{ display: "block", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {notes}
        </Box>
      )}
    </Alert>
  );
}

function ResubmitForm({ request, onDone }: { request: PurchaseRequest; onDone: () => void }) {
  const me = useProcurementMe();
  const lookups = useProcurementLookups();
  const resubmit = useResubmitRequest(request.id);
  if (!me.data || !lookups.data) return <Skeleton variant="rounded" height={320} />;
  return (
    <RequestForm
      initialDraft={draftFromRequest(request)}
      me={me.data}
      lookups={lookups.data}
      submitLabel="Resubmit request"
      submitting={resubmit.isPending}
      error={resubmit.isError ? describeError(resubmit.error) : undefined}
      onSubmit={(input, files) => resubmit.mutate({ input, files }, { onSuccess: onDone })}
    />
  );
}

export default function RequestDetailPage() {
  const { requestId } = useParams();
  const request = useRequest(requestId);
  const [editing, setEditing] = useState(false);
  const data = request.data;

  return (
    <>
      <Link component={RouterLink} to={procurementPaths.requests} underline="none" sx={{ display: "inline-block", mb: 2 }}>
        ← My requests
      </Link>
      <ProcurementShell
        title={data ? `${data.reference} - ${data.title}` : "Purchase request"}
        actions={
          data && !editing ? (
            <Stack direction="row" spacing={2} alignItems="center">
              <RequestStatusChip status={data.status} />
              {data.status === "rejected" && (
                <Button variant="contained" onClick={() => setEditing(true)}>
                  Edit and resubmit
                </Button>
              )}
            </Stack>
          ) : undefined
        }
      >
        {request.isError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void request.refetch()}>
                Retry
              </Button>
            }
          >
            {describeError(request.error)}
          </Alert>
        )}
        {request.isPending && !request.isError && <Skeleton variant="rounded" height={320} />}
        {data && (
          <Stack spacing={2}>
            <Decision request={data} />
            {editing ? (
              <>
                <Button color="inherit" variant="outlined" onClick={() => setEditing(false)} sx={{ alignSelf: "flex-start" }}>
                  Cancel editing
                </Button>
                <ResubmitForm request={data} onDone={() => setEditing(false)} />
              </>
            ) : (
              <>
                {data.status !== "rejected" && (
                  <Alert severity="info">This request is read-only in its current state.</Alert>
                )}
                <RequestSummary
                  view={{
                    category: data.category,
                    requester: data.requester,
                    teamLead: data.teamLead,
                    details: data.details,
                    vendors: data.vendors,
                    budget: data.budget,
                    budgetApproverEmails: data.budgetApprovers.map((a) => a.email),
                    notes: data.notes,
                    attachments: data.attachments.map((a) => ({ name: a.filename, sizeBytes: a.sizeBytes })),
                    date: { label: "Raised", iso: data.submittedAt },
                  }}
                />
              </>
            )}
          </Stack>
        )}
      </ProcurementShell>
    </>
  );
}
