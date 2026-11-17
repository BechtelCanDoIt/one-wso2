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

import { Alert, Box } from "@wso2/oxygen-ui";
import { formatDate } from "../procurementFormat";
import type { PurchaseRequest } from "../types";

export default function DecisionNotice({ request }: { request: PurchaseRequest }) {
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
