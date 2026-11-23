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

import type { JSX, ReactNode } from "react";
import { Box, Card, Typography } from "@wso2/oxygen-ui";

/** A fact, or a falsy value where a condition left it out. */
export type MaybeFact = Fact | false | null | undefined | "" | 0;

/** One label and its value. `full` spans the whole row (addresses, scope, tables). */
export interface Fact {
  readonly label: string;
  readonly value: ReactNode;
  readonly full?: boolean;
}

/** Label above value, in a grid: the record's facts on a detail page, and the Details tab. */
export function FactsGrid({ facts, columns = 4 }: { readonly facts: readonly MaybeFact[]; readonly columns?: 2 | 3 | 4 }): JSX.Element {
  const shown = facts.filter((f): f is Fact => Boolean(f)).filter((f) => f.value !== undefined && f.value !== null && f.value !== "");
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: `repeat(${columns}, minmax(0, 1fr))` },
        gap: "16px 24px",
      }}
    >
      {shown.map((f) => (
        <Box key={f.label} sx={{ minWidth: 0, ...(f.full ? { gridColumn: "1 / -1" } : {}) }}>
          <Typography component="dt" sx={{ fontSize: 12, color: "text.secondary", mb: 0.4 }}>
            {f.label}
          </Typography>
          <Box component="dd" sx={{ m: 0, fontSize: 13.5, overflowWrap: "anywhere", whiteSpace: typeof f.value === "string" ? "pre-line" : undefined }}>
            {f.value}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/** The facts card under a detail page's title. */
export function FactsCard({ facts, columns }: { readonly facts: readonly MaybeFact[]; readonly columns?: 2 | 3 | 4 }): JSX.Element {
  return (
    <Card variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
      <FactsGrid facts={facts} columns={columns} />
    </Card>
  );
}
