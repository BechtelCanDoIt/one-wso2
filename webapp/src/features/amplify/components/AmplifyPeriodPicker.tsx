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

import { useState } from "react";
import { MenuItem, Stack, TextField } from "@wso2/oxygen-ui";
import {
  currentPeriodMonth,
  currentPeriodQuarter,
  periodKind,
  type PeriodKind,
} from "./amplifyUi";

/** How far back the quarter picker's year list goes, on top of this year. */
const YEARS_BACK = 4;

const QUARTERS = ["1", "2", "3", "4"];

interface Quarter {
  year: string;
  q: string;
}

function splitQuarter(period: string): Quarter | undefined {
  const m = /^(\d{4})-Q([1-4])$/.exec(period);
  return m ? { year: m[1], q: m[2] } : undefined;
}

/**
 * The period control for the leaderboard and Team: **All time**, a **month**
 * picker, or a **quarter** picker — because the wire value is not an enum.
 *
 * The backend accepts exactly `ALL`, `YYYY-MM` or `YYYY-Qn` (openapi `Period`,
 * enforced by `checkPeriod`); `MONTH`/`QUARTER` would come back as
 * `400 VALIDATION_FAILED`. So the human choice is translated to a wire value on
 * the way out and decoded back on the way in, and the labels stay readable
 * ("All time", "Oct 2026", "Q4 2026") while the query string stays legal.
 */
export default function AmplifyPeriodPicker({
  value,
  onChange,
  label = "Period",
}: {
  /** The current wire value: `ALL`, `YYYY-MM` or `YYYY-Qn`. */
  value: string;
  /** Receives the next wire value. */
  onChange: (period: string) => void;
  label?: string;
}) {
  const kind = periodKind(value);
  // The month/quarter sub-values are remembered so stepping between kinds does
  // not lose the month the reader had picked.
  const [month, setMonth] = useState(() => (kind === "MONTH" ? value : currentPeriodMonth()));
  const [quarter, setQuarter] = useState<Quarter>(() => splitQuarter(value) ?? splitQuarter(currentPeriodQuarter())!);

  const selectKind = (next: PeriodKind) => {
    if (next === "ALL") onChange("ALL");
    else if (next === "MONTH") onChange(month);
    else onChange(`${quarter.year}-Q${quarter.q}`);
  };

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: YEARS_BACK + 1 }, (_, i) => String(thisYear - i));
  if (!years.includes(quarter.year)) years.unshift(quarter.year);

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", flexWrap: "wrap", rowGap: 1.5 }}>
      <TextField
        select
        size="small"
        label={label}
        value={kind}
        onChange={(e) => selectKind(e.target.value as PeriodKind)}
        sx={{ minWidth: 150 }}
      >
        <MenuItem value="ALL">All time</MenuItem>
        <MenuItem value="MONTH">A month…</MenuItem>
        <MenuItem value="QUARTER">A quarter…</MenuItem>
      </TextField>

      {kind === "MONTH" && (
        <TextField
          type="month"
          size="small"
          label="Month"
          value={month}
          onChange={(e) => {
            if (!e.target.value) return;
            setMonth(e.target.value);
            onChange(e.target.value);
          }}
          sx={{ minWidth: 170 }}
        />
      )}

      {kind === "QUARTER" && (
        <>
          <TextField
            select
            size="small"
            label="Year"
            value={quarter.year}
            onChange={(e) => {
              const next = { ...quarter, year: e.target.value };
              setQuarter(next);
              onChange(`${next.year}-Q${next.q}`);
            }}
            sx={{ minWidth: 110 }}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Quarter"
            value={quarter.q}
            onChange={(e) => {
              const next = { ...quarter, q: e.target.value };
              setQuarter(next);
              onChange(`${next.year}-Q${next.q}`);
            }}
            sx={{ minWidth: 110 }}
          >
            {QUARTERS.map((q) => (
              <MenuItem key={q} value={q}>
                Q{q}
              </MenuItem>
            ))}
          </TextField>
        </>
      )}
    </Stack>
  );
}
