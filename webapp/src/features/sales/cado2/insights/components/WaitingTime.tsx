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
import { Link as RouterLink } from "react-router";
import { Box, Link, Typography } from "@wso2/oxygen-ui";
import { cado2Paths } from "@features/sales/cado2/cado2Paths";
import type { AgingBucket, OldestWait } from "../api/insightsTypes";
import { compactMoney } from "../utils/format";
import { useInsightsPalette } from "./insightsPalette";

const LABELS: Record<string, string> = { LT_1D: "Under a day", D1_3: "1–3 days", D3_7: "3–7 days", GT_7D: "Over a week" };

/**
 * Waiting time (v2): the quotes in approval, by how long since submission,
 * as one bar and a four-column summary, then the longest wait.
 */
export default function WaitingTime({
  buckets,
  oldest,
  currency,
}: {
  readonly buckets: readonly AgingBucket[];
  readonly oldest: OldestWait | null;
  readonly currency: string;
}): JSX.Element {
  const c = useInsightsPalette();
  const colors = [c.ok, c.okPale, c.soon, c.late];
  const total = buckets.reduce((n, b) => n + b.quotes, 0);
  if (total === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
        No quotes are in approval.
      </Typography>
    );
  }
  return (
    <Box>
      <Box sx={{ display: "flex", height: 16, borderRadius: 1, overflow: "hidden", gap: "2px" }} aria-hidden>
        {buckets.map((b, i) => (b.quotes > 0 ? <Box key={b.key} sx={{ flex: b.quotes, bgcolor: colors[i] }} /> : null))}
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
          mt: 2.25,
          border: 1,
          borderColor: c.line,
          borderRadius: 2.5,
          overflow: "hidden",
        }}
      >
        {buckets.map((b, i) => (
          <Box key={b.key} sx={{ p: 1.5, borderLeft: i === 0 ? 0 : 1, borderColor: c.line }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: colors[i] }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {LABELS[b.key] ?? b.label}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 22, fontWeight: 700, mt: 0.5, fontVariantNumeric: "tabular-nums" }}>{b.quotes}</Typography>
            <Typography variant="caption" color="text.secondary">
              {b.value ? compactMoney(b.value, currency) : "—"}
            </Typography>
          </Box>
        ))}
      </Box>
      {oldest ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: 13 }}>
          Longest wait:{" "}
          <Link component={RouterLink} to={cado2Paths.quote(oldest.quoteId, "approvals")} sx={{ fontWeight: 700, color: "text.primary" }}>
            {oldest.quoteNumber ?? `Quote ${oldest.quoteId}`}
          </Link>
          {oldest.accountName ? ` (${oldest.accountName})` : ""},{" "}
          <Box component="b" sx={{ color: "text.primary" }}>
            {oldest.days} {oldest.days === 1 ? "day" : "days"}
          </Box>
          {oldest.waitingOn.length ? `, now with ${oldest.waitingOn.join(" and ")}` : ""}
        </Typography>
      ) : null}
    </Box>
  );
}
