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
import { Box, Stack, Typography } from "@wso2/oxygen-ui";
import { useDocumentTitle } from "@hooks/useDocumentTitle";
import DeskFilterBar from "../components/DeskFilterBar";
import DeskLane from "../components/DeskLane";
import DeskList from "../components/DeskList";
import { COLUMNS, filterQuery, NO_FILTERS, type DeskFilters } from "../utils/deskBoard";
import type { DeskColumnKey } from "../api/deskTypes";

/**
 * The Deal Desk board (D130): every quote in flight, by what it needs from
 * Deal Desk next. Filters on top narrow every column; each column has its own
 * sort and quick filter, and opens as a paged list for hundreds.
 */
export default function DeskBoardPage(): JSX.Element {
  useDocumentTitle("Deal Desk");
  const [filters, setFilters] = useState<DeskFilters>(NO_FILTERS);
  const [list, setList] = useState<{ column: DeskColumnKey; sort: string; quick: string } | null>(null);
  const query = filterQuery(filters).toString();
  const listSpec = list ? COLUMNS.find((c) => c.key === list.column) : undefined;

  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          Deal Desk
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Every quote in flight, by what it needs from Deal Desk next.
        </Typography>
      </Box>
      <DeskFilterBar filters={filters} onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))} />
      {list && listSpec ? (
        <DeskList key={`${list.column}-${list.quick}`} spec={listSpec} filterQuery={query} initialSort={list.sort} quick={list.quick} onBack={() => setList(null)} />
      ) : (
        <Box sx={{ display: "grid", gap: 1.75, alignItems: "start", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" } }}>
          {COLUMNS.map((spec) => (
            <DeskLane key={spec.key} spec={spec} filterQuery={query} onOpenList={(sort, quick) => setList({ column: spec.key, sort, quick })} />
          ))}
        </Box>
      )}
    </Stack>
  );
}
