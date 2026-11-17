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
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Link, Skeleton, Stack, Typography } from "@wso2/oxygen-ui";
import { describeError } from "@api/errors";
import { RequestStatusChip } from "../components/ProcurementChips";
import RequestSummary from "../components/RequestSummary";
import RequestForm from "../request-form/RequestForm";
import { budgetForDisplay, draftFromRequest } from "../request-form/requestFormModel";
import { useEngagementCodes, useProcurementLookups, useProcurementMe, useRequest, useResubmitRequest, useCancelRequest } from "../api/useProcurement";
import { formatDate } from "../procurementFormat";
import { procurementPaths } from "../procurementPaths";
import type { PurchaseRequest } from "../types";

function Decision({ request }: { request: PurchaseRequest }) {
  if (request.status === "draft") return <Alert severity="info">This request has not been submitted.</Alert>;
  if (request.status === "cancelled") return <Alert severity="info">This request was cancelled.</Alert>;
  const { decision, notes, decidedAt, decidedBy, isOverride } = request.teamLeadDecision;
  const approver = request.teamLead?.name ?? "the approvers";
  if (decision === "pending") {
    return <Alert severity="info">Waiting for {approver} to approve or reject this request.</Alert>;
  }
  const approved = decision === "approved";
  return (
    <Alert severity={approved ? "success" : "error"}>
      {approved ? "Approved" : "Rejected"} by {decidedBy || approver}
      {isOverride ? " (Procurement review)" : ""}
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
  const retryOf = (failed: typeof me | typeof lookups) => (
    <Button color="inherit" size="small" onClick={() => void failed.refetch()}>
      Retry
    </Button>
  );
  // Nothing to show until both have loaded once, so a failure then blocks the form.
  const blocking = !me.data && me.isError ? me : !lookups.data && lookups.isError ? lookups : null;
  if (blocking) {
    return (
      <Alert severity="error" action={retryOf(blocking)}>
        {describeError(blocking.error)}
      </Alert>
    );
  }
  if (!me.data || !lookups.data) return <Skeleton variant="rounded" height={320} />;
  // A later refresh can fail while the data is still held. The form stays mounted, so what has been typed and the
  // step it is on are not lost; the failure is shown beside it.
  const refreshFailed = me.isError ? me : lookups.isError ? lookups : null;
  return (
    <>
      {refreshFailed && (
        <Alert severity="warning" action={retryOf(refreshFailed)} sx={{ mb: 2 }}>
          {describeError(refreshFailed.error)}
        </Alert>
      )}
      <RequestForm
        initialDraft={draftFromRequest(request)}
        me={me.data}
        lookups={lookups.data}
        submitLabel="Resubmit request"
        submitting={resubmit.isPending}
        error={resubmit.isError ? describeError(resubmit.error) : undefined}
        onSubmit={(input) => resubmit.mutate(input, { onSuccess: onDone })}
      />
    </>
  );
}

export default function RequestDetailPage() {
  const { requestId } = useParams();
  // Keyed by the request, so the editor and its draft start over when another request is opened.
  return <RequestDetailContent key={requestId} />;
}

function RequestDetailContent() {
  const { requestId } = useParams();
  const request = useRequest(requestId);
  const [editing, setEditing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const cancel = useCancelRequest(requestId ?? "");
  const data = request.data;
  const lookups = useProcurementLookups();
  const unitName = lookups.data?.businessUnits.find((u) => u.value === data?.budget.businessUnit)?.label ?? "";
  const engagementCodes = useEngagementCodes(unitName);

  return (
    <>
      <Link component={RouterLink} to={procurementPaths.requests} underline="none" sx={{ display: "inline-block", mb: 2 }}>
        ← My requests
      </Link>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">{data ? `${data.reference ?? "Draft"} - ${data.title}` : "Purchase request"}</Typography>
        {data && !editing && (
          <Stack direction="row" spacing={2} alignItems="center">
            <RequestStatusChip status={data.status} />
            {(data.status === "submitted" || data.status === "rejected") && (
              <Button color="inherit" variant="outlined" onClick={() => setConfirmingCancel(true)}>
                Cancel request
              </Button>
            )}
            {data.status === "rejected" && data.category !== "EVENTS" && (
              <Button variant="contained" onClick={() => setEditing(true)}>
                Edit and resubmit
              </Button>
            )}
          </Stack>
        )}
      </Stack>
      <>
        <Dialog open={confirmingCancel} onClose={() => !cancel.isPending && setConfirmingCancel(false)}>
          <DialogTitle>Cancel this request?</DialogTitle>
          <DialogContent>
            <DialogContentText>The request is withdrawn and can no longer be approved or edited.</DialogContentText>
            {cancel.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {describeError(cancel.error)}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button color="inherit" disabled={cancel.isPending} onClick={() => setConfirmingCancel(false)}>
              Keep request
            </Button>
            <Button
              color="error"
              variant="contained"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(undefined, { onSuccess: () => setConfirmingCancel(false) })}
            >
              {cancel.isPending ? "Cancelling…" : "Cancel request"}
            </Button>
          </DialogActions>
        </Dialog>
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
                {(lookups.isError || engagementCodes.isError) && (
                  <Alert
                    severity="warning"
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => {
                          if (lookups.isError) void lookups.refetch();
                          if (engagementCodes.isError) void engagementCodes.refetch();
                        }}
                      >
                        Retry
                      </Button>
                    }
                  >
                    Some names could not be loaded, so budget values show as codes.{" "}
                    {describeError(lookups.isError ? lookups.error : engagementCodes.error)}
                  </Alert>
                )}
                <RequestSummary
                  view={{
                    category: data.category,
                    requester: data.requester,
                    teamLead: data.teamLead,
                    additionalApprovers: data.additionalApprovers,
                    details: data.details,
                    vendors: data.vendors,
                    budget: lookups.data ? budgetForDisplay(data.budget, lookups.data, engagementCodes.data ?? []) : data.budget,
                    budgetApprover: data.budgetApproverName,
                    notes: data.notes,
                    date: data.submittedAt ? { label: "Raised", iso: data.submittedAt } : undefined,
                  }}
                />
              </>
            )}
          </Stack>
        )}
      </>
    </>
  );
}
