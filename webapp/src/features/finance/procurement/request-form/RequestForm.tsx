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
import { Alert, alpha, Box, Button, Checkbox, FormControlLabel, Step, StepButton, Stepper, Stack, Typography, type Theme } from "@wso2/oxygen-ui";
import type { ProcurementLookups, ProcurementMe, PurchaseRequestInput, RequestDetails } from "../types";
import RequestSummary from "../components/RequestSummary";
import BudgetStep from "./BudgetStep";
import { StepTitle } from "./formFields";
import CategoryStep from "./CategoryStep";
import DetailsStep from "./DetailsStep";
import RequesterStep from "./RequesterStep";
import {
  detailsLabel,
  draftToInput,
  incompleteSteps,
  missingForStep,
  REQUEST_STEPS,
  STEP_BUDGET,
  STEP_CATEGORY,
  STEP_DETAILS,
  STEP_REQUESTER,
  STEP_REVIEW,
  type RequestDraft,
} from "./requestFormModel";

const DECLARATION =
  "I confirm the information is accurate and complete, and authorise the Procurement team to proceed. " +
  "No commitment will be made to a vendor until a formal Purchase Order is issued.";

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const DECLARATION_REQUIRED = "Tick the declaration to submit.";

/**
 * The five-step request form, shared by raising a request and resubmitting a
 * rejected one. The form only collects: what is sent is `draftToInput`, which
 * leaves out the requester, status and dates the server sets itself.
 *
 * @param initialDraft - The starting values
 * @param submitLabel - The final button, e.g. "Submit request"
 * @param submitting - Disables the final button while its request is in flight
 * @param error - The last submit failure, to show above the buttons
 * @param onSubmit - Called once the form is complete and the declaration made
 */
export default function RequestForm({
  initialDraft,
  me,
  lookups,
  submitLabel,
  submitting,
  error,
  onSubmit,
}: {
  initialDraft: RequestDraft;
  me: ProcurementMe;
  lookups: ProcurementLookups;
  submitLabel: string;
  submitting: boolean;
  error?: string;
  onSubmit: (input: PurchaseRequestInput, files: File[]) => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState(STEP_REQUESTER);
  const [missing, setMissing] = useState<string[]>([]);
  const [declarationMissing, setDeclarationMissing] = useState(false);

  const patch = (next: Partial<RequestDraft>) => setDraft((current) => ({ ...current, ...next }));
  const patchDetails = (next: Partial<RequestDetails>) =>
    setDraft((current) => ({ ...current, details: { ...current.details, ...next } }));
  const goTo = (target: number) => {
    setMissing([]);
    setStep(target);
  };

  // Any earlier step can be revisited; a later one only once every step before it is complete.
  const jumpTo = (target: number) => {
    if (target <= step) return goTo(target);
    const blocking = incompleteSteps(draft, me).find((s) => s.step < target);
    if (blocking) return void (setStep(blocking.step), setMissing(blocking.missing));
    goTo(target);
  };

  const next = () => {
    const stillMissing = missingForStep(step, draft, me);
    if (stillMissing.length > 0) return setMissing(stillMissing);
    goTo(step + 1);
  };

  const submit = () => {
    if (!draft.declarationAccepted) return setDeclarationMissing(true);
    const incomplete = incompleteSteps(draft, me);
    if (incomplete.length > 0) {
      setStep(incomplete[0].step);
      return setMissing(incomplete[0].missing);
    }
    onSubmit(draftToInput(draft), files);
  };

  return (
    <Stack spacing={3}>
      <Stepper activeStep={step - 1} alternativeLabel>
        {REQUEST_STEPS.map((label, index) => (
          <Step key={label} completed={index + 1 < step}>
            <StepButton onClick={() => jumpTo(index + 1)}>{index === STEP_DETAILS - 1 ? detailsLabel(draft.category) : label}</StepButton>
          </Step>
        ))}
      </Stepper>

      <Box>
        {step === STEP_REQUESTER && <RequesterStep draft={draft} me={me} today={todayIso()} onChange={patch} />}
        {step === STEP_CATEGORY && <CategoryStep category={draft.category} onChange={(category) => patch({ category })} />}
        {step === STEP_DETAILS && <DetailsStep draft={draft} lookups={lookups} onChange={patchDetails} />}
        {step === STEP_BUDGET && <BudgetStep draft={draft} lookups={lookups} files={files} onFiles={setFiles} onChange={patch} />}
        {step === STEP_REVIEW && (
          <Stack spacing={2}>
            <StepTitle>Review &amp; submit</StepTitle>
            <RequestSummary
              view={{
                category: draft.category,
                requester: me,
                teamLead: draft.teamLead,
                details: draft.details,
                vendors: draft.vendors,
                budget: draft.budget,
                budgetApproverEmails: draft.budgetApproverEmails,
                notes: draft.notes,
                attachments: files.map((f) => ({ name: f.name, sizeBytes: f.size })),
                date: { label: "Date", iso: todayIso() },
              }}
              onEditStep={goTo}
            />
          </Stack>
        )}
      </Box>

      {missing.length > 0 && <Alert severity="warning">Please complete: {missing.join(", ")}.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {step === STEP_REVIEW ? (
        <Stack
          spacing={2}
          sx={{
            p: 2.5,
            border: 1,
            borderColor: "divider",
            borderRadius: 1.5,
            bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.06),
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={draft.declarationAccepted}
                onChange={(e) => {
                  patch({ declarationAccepted: e.target.checked });
                  if (e.target.checked) setDeclarationMissing(false);
                }}
              />
            }
            label={DECLARATION}
          />
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} useFlexGap flexWrap="wrap">
            <Button variant="outlined" color="inherit" disabled={submitting} onClick={() => goTo(step - 1)}>
              Back
            </Button>
            <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap" justifyContent="flex-end">
              {declarationMissing && !draft.declarationAccepted && (
                <Typography role="alert" variant="body2" color="error">
                  {DECLARATION_REQUIRED}
                </Typography>
              )}
              <Button variant="contained" onClick={submit} disabled={submitting}>
                {submitting ? "Submitting…" : submitLabel}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      ) : (
        <Stack direction="row" justifyContent={step === STEP_REQUESTER ? "flex-end" : "space-between"}>
          {step > STEP_REQUESTER && (
            <Button variant="outlined" color="inherit" onClick={() => goTo(step - 1)}>
              Back
            </Button>
          )}
          <Button variant="contained" onClick={next}>
            {step === STEP_BUDGET ? "Next: review" : "Continue"}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
