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
import { Alert, Button, MenuItem, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import { describeError } from "@api/errors";
import { useAssignRequest, useSetPriority, useUnassignRequest } from "../../api/useProcurement";
import type { Priority, PurchaseRequest } from "../../types";

const PRIORITIES: Priority[] = ["P1", "P2", "P3"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Where the Procurement team assigns an approved request and sets how urgent it is. */
export default function HandlingPanel({ request, me }: { request: PurchaseRequest; me: string }) {
  const assign = useAssignRequest(request.id);
  const unassign = useUnassignRequest(request.id);
  const setPriority = useSetPriority(request.id);
  const [email, setEmail] = useState("");
  const [emailProblem, setEmailProblem] = useState<string | null>(null);
  const failure = [assign, unassign, setPriority].find((m) => m.isError);
  const pending = assign.isPending || unassign.isPending || setPriority.isPending;
  const mine = request.assignee.toLowerCase() === me.toLowerCase();
  // The backend does not let the requester or an approver of a request handle it.
  const own = [request.requester.email, request.teamLead?.email ?? "", ...request.additionalApprovers].some(
    (person) => person.toLowerCase() === me.toLowerCase(),
  );
  const busy = pending || own;
  const assignToEmail = () => {
    const target = email.trim();
    if (!EMAIL.test(target)) return setEmailProblem("Enter a valid email address.");
    setEmailProblem(null);
    assign.mutate(target, { onSuccess: () => setEmail("") });
  };

  return (
    <Stack spacing={2} sx={{ p: 2.5, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Handling
      </Typography>
      <Typography variant="body2">Assigned to: {request.assignee || "Nobody"}</Typography>
      <TextField
        select
        size="small"
        label="Priority"
        value={request.priority ?? ""}
        disabled={busy}
        onChange={(e) => setPriority.mutate(e.target.value as Priority)}
        sx={{ maxWidth: 200 }}
      >
        {PRIORITIES.map((p) => (
          <MenuItem key={p} value={p}>
            {p}
          </MenuItem>
        ))}
      </TextField>
      <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
        {!mine && !own && (
          <Button variant="contained" disabled={busy} onClick={() => assign.mutate(undefined)}>
            {request.assignee ? "Take over" : "Assign to me"}
          </Button>
        )}
        {request.status === "assigned" && (
          <Button color="inherit" variant="outlined" disabled={busy} onClick={() => unassign.mutate()}>
            Unassign
          </Button>
        )}
      </Stack>
      {own && <Alert severity="info">You raised or approve this request, so you can't handle it.</Alert>}
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <TextField
          size="small"
          type="email"
          label="Assign to someone else (email)"
          value={email}
          error={emailProblem !== null}
          helperText={emailProblem}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailProblem(null);
          }}
          sx={{ flex: 1, maxWidth: 360 }}
        />
        <Button variant="outlined" disabled={busy || email.trim() === ""} onClick={assignToEmail} sx={{ mt: "1px" }}>
          Assign
        </Button>
      </Stack>
      {failure && <Alert severity="error">{describeError(failure.error)}</Alert>}
    </Stack>
  );
}
