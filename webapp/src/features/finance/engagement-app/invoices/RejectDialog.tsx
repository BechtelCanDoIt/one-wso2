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
import { TextField } from "@wso2/oxygen-ui";
import { plural } from "../model/format";
import EaDialog from "../components/EaDialog";

/** Reject needs a reason, as the Travel app asked; the agent sees it. */
export default function RejectDialog({ count, run, onClose, onDone }: { count: number; run: (reason: string) => Promise<void>; onClose: () => void; onDone: () => void }): JSX.Element {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  return (
    <EaDialog
      title="Reject Invoices"
      subtitle={`${plural(count, "invoice")}. The travel agent sees the reason.`}
      confirmLabel="Reject"
      confirmColor="error"
      busy={busy}
      error={error}
      onClose={onClose}
      onConfirm={() => {
        if (!reason.trim()) return setError("Add the reason for rejecting");
        setBusy(true);
        run(reason.trim()).then(
          () => {
            setBusy(false);
            onDone();
          },
          (e: unknown) => {
            setBusy(false);
            setError(e);
          },
        );
      }}
    >
      <TextField fullWidth multiline minRows={3} required label="Rejected Reason" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ mt: 1 }} />
    </EaDialog>
  );
}
