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
import { RequestStatusChip } from "../components/ProcurementChips";
import { useMyRequests } from "../api/useProcurement";
import { formatDate } from "../procurementFormat";
import { procurementPaths } from "../procurementPaths";

const CATEGORY_LABEL = { IT: "IT", "NON-IT": "Non-IT", EVENTS: "Marketing & Events" } as const;

export default function MyRequestsPage() {
  const requests = useMyRequests();
  const navigate = useNavigate();

  return (
    <>
      {requests.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void requests.refetch()}>
              Retry
            </Button>
          }
        >
          {describeError(requests.error)}
        </Alert>
      )}
      {requests.isPending && !requests.isError && <Skeleton variant="rounded" height={200} />}
      {requests.data && requests.data.length === 0 && (
        <Typography color="text.secondary">You haven't submitted any requests yet</Typography>
      )}
      {requests.data && requests.data.length > 0 && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Reference</TableCell>
                <TableCell>Request</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Raised</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.data.map((r) => (
                <TableRow
                  key={r.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  // The reference link does its own navigating; a click anywhere else on the row opens the request too.
                  onClick={(e) => {
                    if (!(e.target as HTMLElement).closest("a")) navigate(procurementPaths.request(r.id));
                  }}
                >
                  <TableCell>
                    <Link component={RouterLink} to={procurementPaths.request(r.id)} underline="none" sx={{ fontWeight: 500 }}>
                      {r.reference ?? "Draft"}
                    </Link>
                  </TableCell>
                  <TableCell sx={{ overflowWrap: "anywhere" }}>{r.title}</TableCell>
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
