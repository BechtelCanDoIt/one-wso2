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

/** Where the Procurement team assigns an approved request and sets how urgent it is. */
export default function HandlingPanel({ request, me }: { request: PurchaseRequest; me: string }) {
  const assign = useAssignRequest(request.id);
  const unassign = useUnassignRequest(request.id);
  const setPriority = useSetPriority(request.id);
  const [email, setEmail] = useState("");
  const failure = [assign, unassign, setPriority].find((m) => m.isError);
  const busy = assign.isPending || unassign.isPending || setPriority.isPending;
  const mine = request.assignee.toLowerCase() === me.toLowerCase();

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
        {!mine && (
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
      <Stack direction="row" spacing={2} alignItems="flex-end">
        <TextField
          size="small"
          type="email"
          label="Assign to someone else (email)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ flex: 1, maxWidth: 360 }}
        />
        <Button
          variant="outlined"
          disabled={busy || email.trim() === ""}
          onClick={() => assign.mutate(email.trim(), { onSuccess: () => setEmail("") })}
        >
          Assign
        </Button>
      </Stack>
      {failure && <Alert severity="error">{describeError(failure.error)}</Alert>}
    </Stack>
  );
}
