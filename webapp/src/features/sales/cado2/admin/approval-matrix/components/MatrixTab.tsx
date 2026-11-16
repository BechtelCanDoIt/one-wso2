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
import { alpha, Box, Stack, Typography } from "@wso2/oxygen-ui";
import { TableIcon } from "@wso2/oxygen-ui-icons-react";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import type { ApprovalMatrix } from "@features/sales/cado2/approvals/api/approvalTypes";
import MatrixGrid from "@features/sales/cado2/approvals/components/MatrixGrid";
import { changedRows, matrixRows } from "@features/sales/cado2/approvals/model/matrixGrid";

/**
 * The Matrix tab (D176): the discount groups and product mappings as Sales'
 * sheet lays them out, read-only, for checking one against the other. It
 * follows the page's edits; unsaved changes show in blue over the saved value.
 */
export default function MatrixTab({ matrix, saved }: { matrix: ApprovalMatrix; saved: ApprovalMatrix }): JSX.Element {
  const rows = matrixRows(matrix, saved);
  const changed = changedRows(rows);
  return (
    <SectionCard title="Discount approval matrix" icon={<TableIcon size={18} />}>
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          One row per discount group, one column per approver: how far each can approve, &quot;All&quot; where they review every
          line, &quot;N/A&quot; where they aren&apos;t involved. Deal Desk reviews first, then each approver in order.
          {changed
            ? ` ${changed} group${changed === 1 ? " has" : "s have"} unsaved changes, shown in blue with the saved value struck through.`
            : ""}
        </Typography>
        {changed ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: (t) => alpha(t.palette.info.main, 0.12) }} />
            <Typography variant="caption" color="text.secondary">
              Changed, not saved
            </Typography>
          </Stack>
        ) : null}
        <MatrixGrid rows={rows} roles={matrix.roles} />
      </Stack>
    </SectionCard>
  );
}
