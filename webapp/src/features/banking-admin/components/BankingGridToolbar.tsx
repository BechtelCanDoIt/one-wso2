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

import { DataGrid } from "@wso2/oxygen-ui";

// Columns, Filters, Density and Export above every bank-account table.
//
// Export is the reason this exists: these rows get reconciled against
// payroll and NetSuite outside the app, and until now the only way to get
// them out was to widen the browser and copy the page by hand.
//
// Columns and Filters render DataGrid's own `baseButton` slot — the same
// icon-and-label button Density and Export already use. Wrapping them in a
// bare `ToolbarButton` instead gives an icon-only control that reads as
// unfinished beside the other two. Same shape as the Functional Lead
// Portal's own grid toolbar.
export function BankingGridToolbar() {
  return (
    <DataGrid.Toolbar>
      <DataGrid.ColumnsPanelTrigger size="small" startIcon={<DataGrid.GridColumnIcon fontSize="small" />}>
        Columns
      </DataGrid.ColumnsPanelTrigger>
      <DataGrid.FilterPanelTrigger size="small" startIcon={<DataGrid.GridFilterListIcon fontSize="small" />}>
        Filters
      </DataGrid.FilterPanelTrigger>
      <DataGrid.GridToolbarDensitySelector />
      <DataGrid.GridToolbarExport />
    </DataGrid.Toolbar>
  );
}
