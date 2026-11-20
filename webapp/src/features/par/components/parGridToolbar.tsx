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

import type { ReactNode } from "react";
import { Box, DataGrid, InputAdornment, TextField, Tooltip } from "@wso2/oxygen-ui";
import { SearchIcon } from "@wso2/oxygen-ui-icons-react";

// Same reasoning as Finance's ccGridToolbar.tsx (ToolbarNoExport): Export is
// withheld on grids showing live, in-progress PAR status for named
// employees — this app already has a dedicated View Reports flow for
// exporting that data, so a CSV button here would hand it out for free. No
// quick filter either: callers already have their own search box. Uses the
// Panel Trigger API (ColumnsPanelTrigger/FilterPanelTrigger) rather than
// GridToolbarColumnsButton/GridToolbarFilterButton, which are deprecated in
// this DataGrid version. A grid's own search box goes in as `children`, at the start of the same
// row, so search and the buttons share one line: `slotProps={{ toolbar: { children: <ParGridSearch … /> } }}`.
export function ParGridToolbar({ children }: { children?: ReactNode }) {
  return (
    <DataGrid.Toolbar>
      {children}
      <Box sx={{ flex: 1 }} />
      <Tooltip title="Columns">
        <DataGrid.ColumnsPanelTrigger render={<DataGrid.ToolbarButton aria-label="Columns" />}>
          <DataGrid.GridColumnIcon fontSize="small" />
        </DataGrid.ColumnsPanelTrigger>
      </Tooltip>
      <Tooltip title="Filters">
        <DataGrid.FilterPanelTrigger render={<DataGrid.ToolbarButton aria-label="Filters" />}>
          <DataGrid.GridFilterListIcon fontSize="small" />
        </DataGrid.FilterPanelTrigger>
      </Tooltip>
      <DataGrid.GridToolbarDensitySelector />
    </DataGrid.Toolbar>
  );
}

// Same as above, plus Export — for the one admin grid, quota assignment,
// where the legacy app itself offered it (AssignQuota.tsx's ExportToolbar).
export function ParGridToolbarWithExport() {
  return (
    <DataGrid.Toolbar>
      <Tooltip title="Columns">
        <DataGrid.ColumnsPanelTrigger render={<DataGrid.ToolbarButton aria-label="Columns" />}>
          <DataGrid.GridColumnIcon fontSize="small" />
        </DataGrid.ColumnsPanelTrigger>
      </Tooltip>
      <Tooltip title="Filters">
        <DataGrid.FilterPanelTrigger render={<DataGrid.ToolbarButton aria-label="Filters" />}>
          <DataGrid.GridFilterListIcon fontSize="small" />
        </DataGrid.FilterPanelTrigger>
      </Tooltip>
      <DataGrid.GridToolbarDensitySelector />
      <DataGrid.GridToolbarExport />
    </DataGrid.Toolbar>
  );
}

/** A grid's own search box, for the start of its toolbar row (see ParGridToolbar). */
export function ParGridSearch({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon size={16} />
            </InputAdornment>
          ),
        },
        htmlInput: { "aria-label": placeholder },
      }}
    />
  );
}
