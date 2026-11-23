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
import { Alert, alpha, Button, Checkbox, FormControlLabel, Stack, TextField, Typography, type Theme } from "@wso2/oxygen-ui";
import { describeError } from "@api/errors";
import { useDecideRequest } from "../api/useProcurement";
import { LONG_MAX } from "../request-form/fieldLimits";

const DECLARATION = "I confirm that I have reviewed every part of this request.";
const DECLARATION_REQUIRED = "Tick the declaration to send your decision.";
/** The backend keeps a decision's comment to this length. */
const COMMENT_MAX = 1000;

/** Where an approver approves or rejects a request that waits for their decision. */
export default function DecisionPanel({ requestId }: { requestId: string }) {
  const decide = useDecideRequest(requestId);
  const [reviewed, setReviewed] = useState(false);
  const [comment, setComment] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const approve = () => {
    if (!reviewed) return setProblem(DECLARATION_REQUIRED);
    setProblem(null);
    decide.mutate({ decision: "approved", comment, disclaimerAccepted: true });
  };
  const reject = () => {
    if (!reviewed) return setProblem(DECLARATION_REQUIRED);
    if (comment.trim() === "") return setProblem("Add why the request is rejected.");
    setProblem(null);
    decide.mutate({ decision: "rejected", comment, disclaimerAccepted: false });
  };

  return (
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
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Your decision
      </Typography>
      <TextField
        multiline
        minRows={3}
        fullWidth
        label="Comment (required when rejecting)"
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          setProblem(null);
          if (!decide.isPending) decide.reset();
        }}
        slotProps={{ htmlInput: { maxLength: Math.min(COMMENT_MAX, LONG_MAX) } }}
      />
      <FormControlLabel control={<Checkbox
            checked={reviewed}
            onChange={(e) => {
              setReviewed(e.target.checked);
              setProblem(null);
              if (!decide.isPending) decide.reset();
            }}
          />} label={DECLARATION} />
      {(problem || decide.isError) && <Alert severity="error">{problem ?? describeError(decide.error)}</Alert>}
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button color="error" variant="outlined" disabled={decide.isPending} onClick={reject}>
          Reject
        </Button>
        <Button variant="contained" disabled={decide.isPending} onClick={approve}>
          {decide.isPending ? "Saving…" : "Approve"}
        </Button>
      </Stack>
    </Stack>
  );
}
