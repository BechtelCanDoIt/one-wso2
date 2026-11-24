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
import { Box, Card, Skeleton } from "@wso2/oxygen-ui";
import EaTable from "./EaTable";
import { ListCard } from "./ListCard";

/** A facts card while its record loads: label and value bars in the same grid as FactsGrid. */
export function FactsSkeleton({ count = 8, columns = 4 }: { readonly count?: number; readonly columns?: 2 | 3 | 4 }): JSX.Element {
  return (
    <Card variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }} aria-hidden>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: `repeat(${columns}, minmax(0, 1fr))` },
          gap: "16px 24px",
        }}
      >
        {Array.from({ length: count }, (_, i) => (
          <Box key={i}>
            <Skeleton variant="text" width="45%" sx={{ fontSize: 12 }} />
            <Skeleton variant="text" width={`${55 + ((i * 17) % 35)}%`} sx={{ fontSize: 13.5 }} />
          </Box>
        ))}
      </Box>
    </Card>
  );
}

/** A table of placeholder rows, one cell per column. */
export function TableSkeleton({ columns = 4, rows = 3 }: { readonly columns?: number; readonly rows?: number }): JSX.Element {
  const cols = Array.from({ length: columns }, (_, i) => ({ key: `c${i}`, label: "", render: () => null }));
  return <EaTable ariaLabel="Loading" columns={cols} rows={Array.from({ length: rows }, (_, i) => i)} rowKey={String} empty={null} loading />;
}

/** A detail page while its record loads: facts card, tab bar, then a table, matching the loaded layout. */
export function DetailSkeleton({ facts = 8, tabs = 2, columns = 4 }: { readonly facts?: number; readonly tabs?: number; readonly columns?: number }): JSX.Element {
  return (
    <>
      <FactsSkeleton count={facts} />
      <ListCard>
        <Box sx={{ display: "flex", gap: 3, mb: 1.5, borderBottom: 1, borderColor: "divider", pb: 1.25 }} aria-hidden>
          {Array.from({ length: tabs }, (_, i) => (
            <Skeleton key={i} variant="text" width={90} sx={{ fontSize: 14 }} />
          ))}
        </Box>
        <TableSkeleton columns={columns} />
      </ListCard>
    </>
  );
}
