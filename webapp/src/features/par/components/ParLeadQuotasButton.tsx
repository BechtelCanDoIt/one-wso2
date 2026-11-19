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
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@wso2/oxygen-ui";
import { PercentIcon } from "@wso2/oxygen-ui-icons-react";
import ParLeadQuotas from "./ParLeadQuotas";

/** Opens the lead's Top 5%/20% quotas in a dialog, from Lead View's header. */
export default function ParLeadQuotasButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<PercentIcon size={16} />}
        onClick={() => setOpen(true)}
        sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
      >
        View Quotas
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth scroll="paper">
        <DialogTitle>Top 5%/20% quotas</DialogTitle>
        <DialogContent>{open && <ParLeadQuotas />}</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
