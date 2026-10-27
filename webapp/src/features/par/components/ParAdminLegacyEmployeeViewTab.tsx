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

import { useMemo } from "react";
import { Avatar, Box, Chip, DataGrid, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from "@wso2/oxygen-ui";
import { EyeIcon, SearchIcon } from "@wso2/oxygen-ui-icons-react";
import { formatLegacyCycleName } from "../util/parLegacyHistory";
import { resolveLegacyRating } from "../util/legacyParRatingResolvers";
import { isLegacyEmployeeParDone, isLegacyLeadFeedbackDone } from "../util/parAdminHistory";
import { ParGridToolbar } from "./parGridToolbar";
import ParEmptyState from "./ParEmptyState";
import type { ParLegacyHistory } from "../api/types";

function DoneChip({ done }: { done: boolean }) {
  return <Chip size="small" label={done ? "Done" : "Not Done"} color={done ? "success" : "default"} variant="outlined" />;
}

// Legacy counterpart of ParOrgEmployeeViewTab: every participant in the
// legacy cycle, org-wide. Rows are the cycle's summary-mode records, so the
// eye action opens the full record through the parent's drill-down.
export default function ParAdminLegacyEmployeeViewTab({
  records,
  searchText,
  onSearchTextChange,
  nameFor,
  thumbnailFor,
  onOpenRecord,
}: {
  records: ParLegacyHistory[];
  // Owned by ParAdminLegacyCycleView: this tab unmounts while a record is
  // open, so local state would lose the search on the way back.
  searchText: string;
  onSearchTextChange: (value: string) => void;
  nameFor: (email: string) => string;
  thumbnailFor: (email: string) => string | undefined;
  onOpenRecord: (record: ParLegacyHistory) => void;
}) {
  const filteredRows = useMemo(() => {
    const term = searchText.toLowerCase();
    return term
      ? records.filter(
          (row) =>
            nameFor(row.employeeEmail).toLowerCase().includes(term) ||
            row.employeeEmail.toLowerCase().includes(term) ||
            (row.reviewerName ?? "").toLowerCase().includes(term) ||
            (row.department ?? "").toLowerCase().includes(term),
        )
      : records;
  }, [records, nameFor, searchText]);

  const columns = useMemo<DataGrid.GridColDef<ParLegacyHistory>[]>(
    () => [
      {
        field: "employeeName",
        headerName: "Employee Name",
        flex: 1.8,
        valueGetter: (_v, row) => nameFor(row.employeeEmail),
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Avatar
              src={thumbnailFor(params.row.employeeEmail) || undefined}
              slotProps={{ img: { referrerPolicy: "no-referrer" } }}
              sx={{ mr: 2, height: "2.2rem", width: "2.2rem" }}
            />
            <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
              {params.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: "employeeEmail",
        headerName: "Employee Email",
        flex: 1.8,
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography variant="body2" sx={{ fontSize: 13 }} color="text.secondary" noWrap>
              {params.row.employeeEmail}
            </Typography>
          </Box>
        ),
      },
      { field: "department", headerName: "Department", flex: 1.2, valueGetter: (_v, row) => row.department ?? "-" },
      { field: "reviewerName", headerName: "Lead", flex: 1.2, valueGetter: (_v, row) => row.reviewerName ?? "-" },
      {
        field: "employeePar",
        headerName: "Employee PAR",
        flex: 0.8,
        valueGetter: (_v, row) => isLegacyEmployeeParDone(row),
        renderCell: (params) => <DoneChip done={Boolean(params.value)} />,
      },
      {
        field: "leadFeedback",
        headerName: "Lead's Feedback",
        flex: 0.8,
        valueGetter: (_v, row) => isLegacyLeadFeedbackDone(row),
        renderCell: (params) => <DoneChip done={Boolean(params.value)} />,
      },
      {
        field: "overallRating",
        headerName: "Overall Rating",
        flex: 1,
        // Same resolver ParLegacyRecordDetail uses, so a record can't show a
        // different rating here than once opened.
        valueGetter: (_v, row) =>
          resolveLegacyRating(formatLegacyCycleName(row.cycleName), row.managerScoreCode, []).rating ??
          row.overallRating ??
          "Not Assigned",
      },
      {
        field: "actions",
        headerName: "",
        sortable: false,
        flex: 0.4,
        renderCell: (params) => (
          <Tooltip title="View" arrow>
            <IconButton onClick={() => onOpenRecord(params.row)}>
              <EyeIcon size={18} />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [nameFor, thumbnailFor, onOpenRecord],
  );

  if (records.length === 0) {
    return <ParEmptyState text="No employees found" />;
  }

  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <TextField
          size="small"
          placeholder="Search Employee"
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon size={16} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <DataGrid.DataGrid
        rows={filteredRows}
        columns={columns}
        getRowId={(row) => row.legacyHeaderId}
        rowHeight={56}
        disableRowSelectionOnClick
        onRowClick={(params) => onOpenRecord(params.row)}
        showToolbar
        slots={{ toolbar: ParGridToolbar }}
        sx={{ border: "none", "& .MuiDataGrid-row": { cursor: "pointer" } }}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        pageSizeOptions={[10, 20, 25]}
      />
    </Stack>
  );
}
