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

import type { JSX } from "react";
import { Box, Button, Link, Stack, Typography } from "@wso2/oxygen-ui";
import type { ApprovalOutcome, ApprovalStep } from "@features/sales/cado2/approvals/api/approvalTypes";
import { formatDateTime } from "@features/sales/cado2/quotes/form/draftForm";

/** How a role's approval stands when it isn't the reviewer's turn. */
function StatusCard({ step, steps }: { readonly step: ApprovalStep; readonly steps: readonly ApprovalStep[] }): JSX.Element {
  const when = step.actedAt ? ` · ${formatDateTime(step.actedAt)}` : "";
  const by = step.actedByEmail ? `By ${step.actedByEmail}${when}` : when.slice(3);
  const before = step.dependsOn.map((r) => steps.find((s) => s.role === r)?.roleLabel ?? r);
  const view =
    step.status === "APPROVED"
      ? {
          title: "Approved",
          tone: "success.main",
          detail: [
            by,
            step.carriedFrom ? `Carried over from version ${step.carriedFrom.versionNumber}` : "",
            step.approvedOnBehalf ? "Approved on behalf by Deal Desk" : "",
          ].filter(Boolean),
        }
      : step.status === "RETURNED"
        ? { title: "Returned", tone: "error.main", detail: [by, step.comment ? `“${step.comment}”` : ""].filter(Boolean) }
        : step.status === "WAITING"
          ? { title: "Waiting", tone: "text.secondary", detail: [before.length ? `For ${before.join(" and ")} first` : "Not its turn yet"] }
          : { title: "Not needed now", tone: "text.secondary", detail: ["The approval stopped before this one"] };
  return (
    <Box component="section" aria-label={`${step.roleLabel} approval: ${view.title}`} sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="baseline">
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {step.roleLabel} approval
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: view.tone }}>
          {view.title}
        </Typography>
      </Stack>
      {view.detail.map((d) => (
        <Typography key={d} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {d}
        </Typography>
      ))}
    </Box>
  );
}

/**
 * A reviewer's decision (D129), the first part of the approval card beside the quote:
 * what still holds Approve back, if anything, and the buttons.
 * Writing never sits next to these buttons; it's in the quote. When it isn't
 * their turn, how their role's approval stands (approved, returned, waiting).
 */
export default function DecisionCard({
  step,
  steps,
  block,
  onGoToBlock,
  onDecide,
  anchorId,
}: {
  /** The reviewer's pending step. */
  readonly step: ApprovalStep;
  /** The whole workflow, for how a role waits on others. */
  readonly steps: readonly ApprovalStep[];
  /** Why Approve waits (e.g. special terms to write); "" when it doesn't. */
  readonly block: string;
  /** Takes the reviewer to what the block asks for. */
  readonly onGoToBlock?: () => void;
  readonly onDecide: (outcome: ApprovalOutcome, step: ApprovalStep) => void;
  readonly anchorId?: string;
}): JSX.Element {
  if (step.status !== "PENDING") return <StatusCard step={step} steps={steps} />;
  return (
    <Box id={anchorId} component="section" aria-label={`Your decision as ${step.roleLabel}`} sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        Your decision as {step.roleLabel}
      </Typography>
      <Box sx={{ mt: 0.75, "&:empty": { display: "none" } }}>
        {!step.canAct ? (
          <Typography variant="body2" color="text.secondary">
            {step.cantActReason ?? "You can't decide this approval"}
          </Typography>
        ) : block ? (
          <Typography variant="body2" color="text.secondary">
            {block}
            {onGoToBlock ? (
              <>
                {" · "}
                <Link component="button" type="button" variant="body2" sx={{ fontWeight: 600, verticalAlign: "baseline" }} onClick={onGoToBlock}>
                  Go to it
                </Link>
              </>
            ) : null}
          </Typography>
        ) : null}
      </Box>
      {step.canAct ? (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button fullWidth variant="outlined" onClick={() => onDecide("return", step)}>
            Return…
          </Button>
          <Button fullWidth variant="contained" disabled={Boolean(block)} onClick={() => onDecide("approve", step)}>
            Approve
          </Button>
        </Stack>
      ) : null}
    </Box>
  );
}
