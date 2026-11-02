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
import { Box, Stack, Typography } from "@wso2/oxygen-ui";

/** One row of a bar list: a name (and a note under it), the bar, the figure. */
export function BarRow({
  name,
  note,
  bar,
  figure,
}: {
  readonly name: string;
  readonly note?: string;
  readonly bar: ReactNode;
  readonly figure: ReactNode;
}): JSX.Element {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "110px 1fr 52px", sm: "150px 1fr 56px" }, alignItems: "center", gap: 1.75 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13.5 }} noWrap>
          {name}
        </Typography>
        {note ? (
          <Typography variant="caption" color="text.secondary" component="div" noWrap>
            {note}
          </Typography>
        ) : null}
      </Box>
      {bar}
      <Box sx={{ textAlign: "right", fontWeight: 700, fontSize: 14.5, fontVariantNumeric: "tabular-nums" }}>{figure}</Box>
    </Box>
  );
}

/** A legend: colour keys in a row. */
export function Legend({ items, aside }: { readonly items: readonly { label: string; swatch: ReactNode }[]; readonly aside?: ReactNode }): JSX.Element {
  return (
    <Stack direction="row" useFlexGap spacing={2} sx={{ mt: 2, flexWrap: "wrap", alignItems: "center" }}>
      {items.map((i) => (
        <Stack key={i.label} direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          {i.swatch}
          <Typography variant="caption" color="text.secondary">
            {i.label}
          </Typography>
        </Stack>
      ))}
      {aside ? <Box sx={{ ml: "auto" }}>{aside}</Box> : null}
    </Stack>
  );
}

/** A colour key for a legend. */
export function Swatch({ color }: { readonly color: string }): JSX.Element {
  return <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: color }} />;
}
