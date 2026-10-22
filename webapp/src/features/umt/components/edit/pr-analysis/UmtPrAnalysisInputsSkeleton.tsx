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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { Box, Divider, Skeleton, Stack, Typography } from "@wso2/oxygen-ui";
import type { UmtUpdateType } from "../../../api/umtTypes";

// Label widths of the three Update Type radios, so the row ends where the real
// one does.
const RADIO_LABEL_WIDTHS = [96, 168, 196];

// The Pull Requests grid is Pull Request / Preferred Version / delete, the
// Manual Files grid File / Operation / Source / delete. The last track is the
// delete button's fixed column in both.
const PULL_REQUEST_COLUMNS = ["3fr", "1fr", "52px"];
const MANUAL_FILE_COLUMNS = ["3fr", "1fr", "2fr", "52px"];

function SectionHeadingSkeleton({ width }: { width: number }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 2 }}>
      <Typography variant="h6">
        <Skeleton width={width} />
      </Typography>
      <Skeleton variant="circular" width={28} height={28} />
    </Stack>
  );
}

// A header band and two rows, with the grid's 40px header and 52px minimum row
// height.
function GridSkeleton({ columns }: { columns: string[] }) {
  const template = columns.join(" ");
  const textColumns = columns.length - 1;
  return (
    <Box sx={{ mt: 2, border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: template, alignItems: "center", gap: 2, px: 2, height: 40 }}>
        {Array.from({ length: textColumns }, (_, column) => (
          <Skeleton key={column} variant="text" width="45%" />
        ))}
      </Box>
      {[0, 1].map((row) => (
        <Box
          key={row}
          sx={{
            display: "grid",
            gridTemplateColumns: template,
            alignItems: "center",
            gap: 2,
            px: 2,
            height: 52,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          {Array.from({ length: textColumns }, (_, column) => (
            <Skeleton key={column} variant="text" width={column === 0 ? (row === 0 ? "80%" : "62%") : "55%"} />
          ))}
          <Skeleton variant="circular" width={24} height={24} />
        </Box>
      ))}
    </Box>
  );
}

/**
 * Stands in for the PR Analysis inputs (Update Type, Pull Requests, Manual
 * Files) while the analysis they start from loads. Follows the real section,
 * which shows a table only for the update types that have one.
 */
export default function UmtPrAnalysisInputsSkeleton({ updateType }: { updateType: UmtUpdateType }) {
  return (
    <Box role="status" aria-busy="true" aria-label="Loading pull request analysis">
      <Typography variant="h6">
        <Skeleton width={110} />
      </Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", height: 42 }}>
        {RADIO_LABEL_WIDTHS.map((width) => (
          <Stack key={width} direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Skeleton variant="circular" width={20} height={20} />
            <Skeleton variant="text" width={width} />
          </Stack>
        ))}
      </Stack>
      <Divider sx={{ mt: 2 }} />

      {updateType !== "instructionsOnlyUpdate" && (
        <Box>
          <SectionHeadingSkeleton width={120} />
          <GridSkeleton columns={PULL_REQUEST_COLUMNS} />
        </Box>
      )}

      {updateType === "generalUpdate" && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box>
            <SectionHeadingSkeleton width={104} />
            <GridSkeleton columns={MANUAL_FILE_COLUMNS} />
          </Box>
        </>
      )}
    </Box>
  );
}
