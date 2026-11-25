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
import { Link as RouterLink, useNavigate } from "react-router";
import {
  Alert,
  Button,
  Link,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@wso2/oxygen-ui";
import { describeError } from "@api/errors";
import FilterChips from "../../components/FilterChips";
import { RequestStatusChip } from "../../components/ProcurementChips";
import { useApprovals } from "../../api/useProcurement";
import { formatDate } from "../../procurementFormat";
import { workspacePaths } from "../workspacePaths";
import type { RequestStatus } from "../../types";

const CATEGORY_LABEL = { IT: "IT", "NON-IT": "Non-IT", EVENTS: "Marketing & Events" } as const;

const WAITING = "waiting";
const FILTERS: { value: RequestStatus | typeof WAITING; label: string }[] = [
  { value: WAITING, label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "assigned", label: "In progress" },
];

export default function ApprovalsPage() {
  const [filter, setFilter] = useState<RequestStatus | typeof WAITING>(WAITING);
  const approvals = useApprovals(filter === WAITING ? undefined : filter);
  const navigate = useNavigate();

  return (
    <>
      <FilterChips label="Show" options={FILTERS} value={filter} onChange={setFilter} />
      {approvals.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void approvals.refetch()}>
              Retry
            </Button>
          }
        >
          {describeError(approvals.error)}
        </Alert>
      )}
      {approvals.isPending && !approvals.isError && <Skeleton variant="rounded" height={200} />}
      {approvals.data && approvals.data.length === 0 && (
        <Typography color="text.secondary">
          {filter === WAITING ? "Nothing is waiting for your decision" : "No requests with this status"}
        </Typography>
      )}
      {approvals.data && approvals.data.length > 0 && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Reference</TableCell>
                <TableCell>Request</TableCell>
                <TableCell>Requester</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Raised</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvals.data.map((r) => (
                <TableRow
                  key={r.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={(e) => {
                    if (!(e.target as HTMLElement).closest("a")) navigate(workspacePaths.approval(r.id));
                  }}
                >
                  <TableCell>
                    <Link component={RouterLink} to={workspacePaths.approval(r.id)} underline="none" sx={{ fontWeight: 500 }}>
                      {r.reference ?? "Draft"}
                    </Link>
                  </TableCell>
                  <TableCell sx={{ overflowWrap: "anywhere" }}>{r.title}</TableCell>
                  <TableCell sx={{ overflowWrap: "anywhere" }}>{r.requester.name}</TableCell>
                  <TableCell>{CATEGORY_LABEL[r.category]}</TableCell>
                  <TableCell>
                    <RequestStatusChip status={r.status} />
                  </TableCell>
                  <TableCell>{r.submittedAt ? formatDate(r.submittedAt) : "Not submitted"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}
