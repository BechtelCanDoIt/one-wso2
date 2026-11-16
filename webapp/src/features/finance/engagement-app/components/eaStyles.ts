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

/** Button labels as written (Title Case), never upper-cased, and empty selects' labels centred like text fields'; set on the shell and on every dialog and drawer, which render outside it. */
export const EA_SCOPE_SX = {
  "& .MuiButton-root, & .MuiToggleButton-root": { textTransform: "none" },
  "& .MuiFormControl-root:has(.MuiSelect-select) .MuiInputLabel-sizeSmall:not(.MuiInputLabel-shrink)": { top: 0 },
} as const;

/** Table headers in Title Case, as the finance data grids show them. */
export const TABLE_HEAD_SX = {
  "& th": {
    fontSize: 12.5,
    fontWeight: 600,
    color: "text.secondary",
    whiteSpace: "nowrap",
    bgcolor: "background.paper",
  },
} as const;

/** Two columns of the filter grid: a field holding many values, or a pair that should not be split across rows. */
export const FILTER_WIDE_SX = { gridColumn: { xs: "1 / -1", md: "span 2" } } as const;
