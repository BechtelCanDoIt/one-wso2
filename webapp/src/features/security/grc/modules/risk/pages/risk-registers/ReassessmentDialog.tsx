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

import { useEffect, useState } from "react";
import { parseDateOnly, toDateOnlyString } from "@features/security/grc/utils/dateTime";
import { useAuthApiClient } from "@features/security/grc/shim/useAuthApiClient";
import {
  AdapterDateFns,
  Alert,
  Box,
  Button,
  DatePickers,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import type { JSX } from "react";
import { fetchManagementApprovers, fetchRiskOwnerCandidates } from "../../api/riskApi";
import type { CreateAssessmentPayload, RiskDetail, RiskScore, RiskScoreInfo, UserOption } from "../../api/riskApi";
import { dialogPaperSx } from "../cardStyles";
import RiskScoreGrid from "./RiskScoreGrid";

const { DatePicker, LocalizationProvider } = DatePickers;

// withCurrent keeps the risk's saved person selectable even when they are not
// among today's candidates, so opening the dialog never silently blanks a field.
function withCurrent(candidates: UserOption[], id: number, name: string): UserOption[] {
  if (!id || candidates.some((u) => u.id === id)) return candidates;
  return [...candidates, { id, display_name: name || `User #${id}`, email: "", risk_team_ids: [] }];
}

interface ReassessmentDialogProps {
  open: boolean;
  riskCode: string;
  // The risk being assessed — source of the current owner, approver and
  // implementation date the "Risk details" section starts from.
  detail: RiskDetail;
  // True for the risk's Risk Assigner (or a compliance admin). Only they may
  // change owner, approver and implementation date; everyone else sees them
  // read-only. The backend enforces the same rule.
  canEditRiskDetails: boolean;
  riskScores: RiskScore[];
  // The risk's residual score before this assessment — RiskDetail.effective_score,
  // i.e. the latest reassessment if one exists, else the gross score. Null only
  // when the caller has no detail loaded yet.
  previousScore: RiskScoreInfo | null;
  // True when previousScore is actually the gross score (no reassessment has
  // ever been recorded) — worded "Initial" rather than "Previous" since it
  // isn't a residual assessment at all.
  previousIsInitial: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAssessmentPayload) => Promise<void>;
}

export default function ReassessmentDialog({
  open,
  riskCode,
  detail,
  canEditRiskDetails,
  riskScores,
  previousScore,
  previousIsInitial,
  onClose,
  onSubmit,
}: ReassessmentDialogProps): JSX.Element {
  const [likelihood, setLikelihood] = useState(0);
  const [impact, setImpact] = useState(0);
  const [progress, setProgress] = useState("");
  const [reassessmentDate, setReassessmentDate] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const authFetch = useAuthApiClient();
  const [ownerId, setOwnerId] = useState(detail.owner_id);
  const [managementApproverId, setManagementApproverId] = useState(detail.management_approver_id);
  const [implementationDate, setImplementationDate] = useState<Date | null>(parseDateOnly(detail.implementation_date));
  const [ownerCandidates, setOwnerCandidates] = useState<UserOption[]>([]);
  const [approverCandidates, setApproverCandidates] = useState<UserOption[]>([]);
  const [candidatesError, setCandidatesError] = useState(false);

  // Start from the risk as it is each time the dialog opens on it.
  useEffect(() => {
    if (!open) return;
    setOwnerId(detail.owner_id);
    setManagementApproverId(detail.management_approver_id);
    setImplementationDate(parseDateOnly(detail.implementation_date));
  }, [open, detail]);

  // Candidates are role-filtered as in Add Risk and Update Assignees, so only
  // someone who already holds the grant can be picked. Only the assigner can
  // change them, so nobody else needs the lists.
  useEffect(() => {
    if (!open || !canEditRiskDetails) return;
    let cancelled = false;
    const teamIds = [detail.source_register_id, detail.assignment_team_id];
    setCandidatesError(false);
    void Promise.allSettled([
      fetchRiskOwnerCandidates(authFetch, teamIds),
      fetchManagementApprovers(authFetch, teamIds),
    ]).then(([owners, approvers]) => {
      if (cancelled) return;
      if (owners.status !== "fulfilled" || approvers.status !== "fulfilled") {
        setCandidatesError(true);
        return;
      }
      setOwnerCandidates(owners.value);
      setApproverCandidates(approvers.value);
    });
    return () => { cancelled = true; };
  }, [open, canEditRiskDetails, authFetch, detail.source_register_id, detail.assignment_team_id]);

  const ownerOptions = withCurrent(ownerCandidates, detail.owner_id, detail.owner_name);
  const approverOptions = withCurrent(approverCandidates, detail.management_approver_id, detail.management_approver_name);
  const currentImplementationDate = toDateOnlyString(parseDateOnly(detail.implementation_date));

  // A reassessment that makes the risk HIGH needs a Management Approver — the
  // one it already has or one picked here. 0 means none. The backend enforces
  // the same rule.
  const becomesHigh =
    likelihood > 0 &&
    impact > 0 &&
    riskScores.find((sc) => sc.likelihood === likelihood && sc.impact === impact)?.risk_level === "HIGH";
  const approverMissing = becomesHigh && !managementApproverId;

  const handleClose = () => {
    if (submitting) return;
    setLikelihood(0);
    setImpact(0);
    setProgress("");
    setReassessmentDate(null);
    setOwnerId(detail.owner_id);
    setManagementApproverId(detail.management_approver_id);
    setImplementationDate(parseDateOnly(detail.implementation_date));
    setErrors({});
    setApiError("");
    onClose();
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!likelihood || !impact) e.grid = "Please select a residual risk score from the grid.";
    if (!progress.trim()) e.progress = "Progress is required.";
    if (!reassessmentDate) {
      e.reassessmentDate = "Reassessment date is required.";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (reassessmentDate < today) e.reassessmentDate = "Reassessment date cannot be in the past.";
    }
    if (approverMissing) {
      e.approver = canEditRiskDetails
        ? "A Management Approver is required for a HIGH risk."
        : "A Management Approver is required for a HIGH risk. Ask the Risk Assigner to set it.";
    }
    // Only a date the assigner actually changed is checked: an untouched,
    // already-past implementation date (an overdue risk) must not block saving.
    if (canEditRiskDetails) {
      if (!implementationDate) {
        // Clearing is not supported: the payload would omit it and the old date would silently stay.
        if (currentImplementationDate) e.implementationDate = "Implementation date is required.";
      } else if (Number.isNaN(implementationDate.getTime())) {
        e.implementationDate = "Enter a valid implementation date.";
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (toDateOnlyString(implementationDate) !== currentImplementationDate && implementationDate < today) {
          e.implementationDate = "Implementation date cannot be in the past.";
        }
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setApiError("");
    try {
      const payload: CreateAssessmentPayload = {
        likelihood,
        impact,
        progress: progress.trim(),
        reassessment_date: toDateOnlyString(reassessmentDate)!,
      };
      // Only what changed, and only from the assigner — the backend refuses
      // anyone else who sends them.
      if (canEditRiskDetails) {
        if (ownerId !== detail.owner_id) payload.owner_id = ownerId;
        if (managementApproverId !== detail.management_approver_id) payload.management_approver_id = managementApproverId;
        const nextDate = toDateOnlyString(implementationDate);
        if (nextDate && nextDate !== currentImplementationDate) payload.implementation_date = nextDate;
      }
      await onSubmit(payload);
      handleClose();
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle>
        <Typography component="span" variant="h6" fontWeight={700} display="block">
          Reassess Risk
        </Typography>
        <Typography component="span" variant="body2" color="text.secondary" display="block">
          {riskCode} : Record a residual risk assessment
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack gap={3} sx={{ pt: 1 }}>
          {apiError && <Alert severity="error">{apiError}</Alert>}

          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
              <Typography variant="body2" fontWeight={600}>
                Residual Risk Score <span style={{ color: "red" }}>*</span>
              </Typography>
              {previousScore && (
                <Typography variant="caption" color="text.secondary">
                  {previousIsInitial ? "Initial" : "Previous"}:{" "}
                  <strong>{previousScore.risk_level}</strong> · Score {previousScore.risk_rating}
                </Typography>
              )}
            </Stack>
            <RiskScoreGrid
              riskScores={riskScores}
              likelihood={likelihood}
              impact={impact}
              onChange={(l, i) => {
                setLikelihood(l);
                setImpact(i);
                if (errors.grid) setErrors((prev) => ({ ...prev, grid: "" }));
              }}
              error={errors.grid}
              previousLikelihood={previousScore?.likelihood}
              previousImpact={previousScore?.impact}
            />
          </Box>

          <Divider />

          <TextField
            label="Progress"
            multiline
            rows={3}
            fullWidth
            required
            value={progress}
            onChange={(e) => {
              setProgress(e.target.value);
              if (errors.progress) setErrors((prev) => ({ ...prev, progress: "" }));
            }}
            error={!!errors.progress}
            helperText={errors.progress}
            placeholder="Describe the current remediation progress..."
            disabled={submitting}
          />

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Reassessment Date *"
              value={reassessmentDate}
              onChange={(d) => {
                setReassessmentDate(d);
                if (errors.reassessmentDate) setErrors((prev) => ({ ...prev, reassessmentDate: "" }));
              }}
              disablePast
              slotProps={{
                desktopPaper: {
                  sx: {
                    backdropFilter: "none",
                    backgroundColor: "var(--oxygen-palette-background-default)",
                  },
                },
                textField: {
                  fullWidth: true,
                  error: !!errors.reassessmentDate,
                  helperText: errors.reassessmentDate,
                  disabled: submitting,
                },
              }}
            />
          </LocalizationProvider>

          <Divider />

          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
              Risk details
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              {canEditRiskDetails
                ? "Changes here are saved with the assessment and don't send the risk for re-approval."
                : "Only the Risk Assigner can change these."}
            </Typography>
            <Stack gap={2}>
              {candidatesError && (
                <Alert severity="error">
                  Unable to load the Risk Owner and Management Approver candidates. Close the dialog and try again.
                </Alert>
              )}
              <FormControl fullWidth disabled={submitting || !canEditRiskDetails}>
                <InputLabel id="assess-risk-owner-label">Risk Owner</InputLabel>
                <Select labelId="assess-risk-owner-label" label="Risk Owner" value={ownerId} onChange={(e) => setOwnerId(Number(e.target.value))}>
                  {ownerOptions.map((u) => <MenuItem key={u.id} value={u.id}>{u.display_name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth disabled={submitting || !canEditRiskDetails} error={!!errors.approver || approverMissing}>
                <InputLabel id="assess-management-approver-label">Management Approver</InputLabel>
                <Select
                  labelId="assess-management-approver-label"
                  label="Management Approver"
                  value={managementApproverId}
                  onChange={(e) => {
                    setManagementApproverId(Number(e.target.value));
                    if (errors.approver) setErrors((prev) => ({ ...prev, approver: "" }));
                  }}
                >
                  {/* A LOW/MEDIUM risk may have none; it cannot be re-picked once chosen. */}
                  {!detail.management_approver_id && <MenuItem value={0}>None</MenuItem>}
                  {approverOptions.map((u) => <MenuItem key={u.id} value={u.id}>{u.display_name}</MenuItem>)}
                </Select>
                {(errors.approver || approverMissing) && (
                  <FormHelperText>
                    {errors.approver ||
                      (canEditRiskDetails
                        ? "A Management Approver is required for a HIGH risk."
                        : "A Management Approver is required for a HIGH risk. Ask the Risk Assigner to set it.")}
                  </FormHelperText>
                )}
              </FormControl>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Implementation Date"
                  value={implementationDate}
                  onChange={(d) => {
                    setImplementationDate(d);
                    if (errors.implementationDate) setErrors((prev) => ({ ...prev, implementationDate: "" }));
                  }}
                  disabled={submitting || !canEditRiskDetails}
                  slotProps={{
                    desktopPaper: {
                      sx: {
                        backdropFilter: "none",
                        backgroundColor: "var(--oxygen-palette-background-default)",
                      },
                    },
                    textField: {
                      fullWidth: true,
                      error: !!errors.implementationDate,
                      helperText: errors.implementationDate,
                    },
                  }}
                />
              </LocalizationProvider>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          variant="contained"
        >
          {submitting ? "Saving..." : "Save Assessment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
