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

import { useState, type JSX } from "react";
import { MenuItem, TextField } from "@wso2/oxygen-ui";
import type { EngagementStatus, EngagementSummary } from "../api/engagementTypes";
import EaDialog from "../components/EaDialog";
import { ENGAGEMENT_STATUSES } from "../model/statuses";

/** Change Engagement Status, step one: every other legacy value is offered; the next step asks Yes / No. */
export default function PickEngagementStatus({
  e,
  onClose,
  onNext,
}: {
  e: EngagementSummary;
  onClose: () => void;
  onNext: (to: EngagementStatus) => void;
}): JSX.Element {
  const [to, setTo] = useState<EngagementStatus | "">("");
  const [error, setError] = useState("");
  return (
    <EaDialog
      title="Change Engagement Status"
      subtitle={`${e.id} is ${e.engagementStatus}`}
      confirmLabel="Continue"
      cancelLabel="Close"
      error={error}
      onClose={onClose}
      onConfirm={() => (to ? onNext(to) : setError("Select the new status"))}
    >
      <TextField
        select
        fullWidth
        size="small"
        label="Engagement Status"
        required
        value={to}
        onChange={(ev) => setTo(ev.target.value as EngagementStatus)}
        sx={{ mt: 1 }}
      >
        {ENGAGEMENT_STATUSES.filter((s) => s !== e.engagementStatus).map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </TextField>
    </EaDialog>
  );
}
