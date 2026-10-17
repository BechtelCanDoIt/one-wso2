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
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { describeError } from "@api/errors";
import { useAmplifyPoDashboard } from "../api/amplifyHooks";
import AmplifySectionCard from "../components/AmplifySectionCard";
import { AmplifyStat } from "../components/AmplifyShell";
import { campaignStatusColor, formatDateTime, formatMonthLabel } from "../components/amplifyUi";

/** Current `YYYY-MM`, for the month picker's default. */
function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * The PO's numbers: what's waiting, what's gone out, what it's costing, and
 * what's broken. One request (`GET /po/dashboard`), one month at a time.
 */
export default function AmplifyPoDashboardTab() {
  const [month, setMonth] = useState(currentMonth());
  const query = useAmplifyPoDashboard(month);

  return (
    <Box>
      <Box sx={{ maxWidth: 200, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          type="month"
          label="Month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>

      {query.isError ? (
        <Alert severity="error">{describeError(query.error)}</Alert>
      ) : query.isPending ? (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Loading the dashboard…
          </Typography>
        </Stack>
      ) : query.data ? (
        <Stack spacing={2.5}>
          <AmplifySectionCard title="Review queue" caption={formatMonthLabel(query.data.month)}>
            <Stack direction="row" spacing={4} sx={{ flexWrap: "wrap", rowGap: 2 }}>
              <AmplifyStat label="Pending" value={query.data.reviewQueue.pending} />
              <AmplifyStat label="Over SLA" value={query.data.reviewQueue.overSla} />
              <AmplifyStat label="SLA (hours)" value={query.data.reviewQueue.slaHours} />
              <AmplifyStat label="Action required" value={query.data.actionRequired.count} />
            </Stack>
            {query.data.reviewQueue.oldestPendingAt && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
                Oldest pending: {formatDateTime(query.data.reviewQueue.oldestPendingAt)}
              </Typography>
            )}
          </AmplifySectionCard>

          <AmplifySectionCard
            title="Throughput"
            caption={`Last ${query.data.reviewThroughput.windowDays} days`}
          >
            <Stack direction="row" spacing={4} sx={{ flexWrap: "wrap", rowGap: 2 }}>
              <AmplifyStat label="Approved" value={query.data.reviewThroughput.approved} />
              <AmplifyStat label="Rejected" value={query.data.reviewThroughput.rejected} />
              <AmplifyStat label="Amplified" value={query.data.reviewThroughput.amplified} />
              <AmplifyStat
                label="Median hours to decision"
                value={query.data.reviewThroughput.medianHoursToDecision ?? "—"}
              />
            </Stack>
          </AmplifySectionCard>

          <AmplifySectionCard title="Points">
            <Stack direction="row" spacing={4} sx={{ mb: 2, flexWrap: "wrap", rowGap: 2 }}>
              <AmplifyStat label="This month" value={query.data.points.monthTotal} />
              <AmplifyStat label="All time" value={query.data.points.allTimeTotal} />
            </Stack>
            {query.data.points.byAction.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Action</TableCell>
                    <TableCell align="right">Rows</TableCell>
                    <TableCell align="right">Points</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {query.data.points.byAction.map((a) => (
                    <TableRow key={a.action}>
                      <TableCell>{a.action}</TableCell>
                      <TableCell align="right">{a.rows}</TableCell>
                      <TableCell align="right">{a.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AmplifySectionCard>

          <AmplifySectionCard title="Participation">
            <Stack direction="row" spacing={4} sx={{ mb: 2, flexWrap: "wrap", rowGap: 2 }}>
              <AmplifyStat label="Active connections" value={query.data.participation.connections.active} />
              <AmplifyStat label="Expiring" value={query.data.participation.connections.expiring} />
              <AmplifyStat label="Need reconnect" value={query.data.participation.connections.needsReconnect} />
              <AmplifyStat label="Employees with points" value={query.data.participation.employeesWithPoints} />
              <AmplifyStat label="Active (30d)" value={query.data.participation.activeLast30Days} />
            </Stack>
          </AmplifySectionCard>

          <AmplifySectionCard title="Share health" caption={`Last ${query.data.shareHealth.windowDays} days`}>
            <Stack direction="row" spacing={4} sx={{ mb: 2, flexWrap: "wrap", rowGap: 2 }}>
              <AmplifyStat label="Queued" value={query.data.shareHealth.queued} />
              <AmplifyStat label="Published" value={query.data.shareHealth.published} />
              <AmplifyStat label="Failed" value={query.data.shareHealth.failed} />
            </Stack>
            {query.data.shareHealth.failedByReason.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
                {query.data.shareHealth.failedByReason.map((r) => (
                  <Chip key={r.reason} size="small" color="error" variant="outlined" label={`${r.reason}: ${r.count}`} />
                ))}
              </Stack>
            )}
          </AmplifySectionCard>

          <AmplifySectionCard title="Campaigns this month">
            {query.data.campaigns.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No campaigns in this month.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Campaign</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Reposters</TableCell>
                    <TableCell align="right">Approved posts</TableCell>
                    <TableCell align="right">Points</TableCell>
                    <TableCell>Announcement</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {query.data.campaigns.map((c) => (
                    <TableRow key={c.campaignId}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {c.title}
                        </Typography>
                        {c.isPriority && <Chip size="small" color="warning" label="Priority" />}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={campaignStatusColor(c.status)} label={c.status} />
                      </TableCell>
                      <TableCell align="right">{c.reposters}</TableCell>
                      <TableCell align="right">{c.externalSharesApproved}</TableCell>
                      <TableCell align="right">{c.points}</TableCell>
                      <TableCell>{c.announcement ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AmplifySectionCard>

          <AmplifySectionCard title="Recent corrections">
            {query.data.recentCorrections.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No corrections recorded.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell align="right">Points</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {query.data.recentCorrections.map((c) => (
                    <TableRow key={c.reference}>
                      <TableCell>{formatDateTime(c.createdAt)}</TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined" label={c.type} />
                      </TableCell>
                      <TableCell>{c.email ?? c.employeeId}</TableCell>
                      <TableCell>{c.reason ?? "—"}</TableCell>
                      <TableCell align="right">{c.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AmplifySectionCard>
        </Stack>
      ) : null}
    </Box>
  );
}
