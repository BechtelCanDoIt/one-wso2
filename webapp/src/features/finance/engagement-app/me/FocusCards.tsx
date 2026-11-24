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
import type { ReactNode } from "react";
import { Box, Card, Typography } from "@wso2/oxygen-ui";
import { localIsoDate } from "@utils/localDate";
import type { TravelRequestSummary } from "../api/engagementTypes";
import { useMyOverview } from "../api/useEngagementApi";
import { AllocationStatusChip, Mono, TravelStatusChip } from "../components/StatusChips";
import { DateRow } from "../dashboard/dashboardParts";
import { myEngagementPaths } from "../engagementPaths";
import { fmtRange, place } from "../model/format";

const MAX = 3;

/** A heading, then one small card per item side by side (wrapping on narrow screens). */
function Strip({ title, children }: { title: string; children: ReactNode[] }): JSX.Element {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography component="h2" sx={{ fontSize: 14.5, fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
        {children.map((c, i) => (
          <Card key={i} variant="outlined" sx={{ px: 1.75, py: 0.25, minWidth: 0 }}>
            {c}
          </Card>
        ))}
      </Box>
    </Box>
  );
}

/**
 * The current and next allocations (at most three), above the Allocations list; nothing when there are none. A row
 * opens its engagement when the overview or the list (`canOpen`) says the person may open it, and is plain otherwise.
 */
export function AllocationsFocus({ canOpen }: { canOpen: (engagementId: string) => boolean }): JSX.Element | null {
  const overview = useMyOverview();
  const allocations = overview.data?.allocations ?? [];
  if (!allocations.length) return null;
  const today = localIsoDate();
  const current = allocations.filter((a) => a.current ?? (a.start <= today && today <= a.end)).length;
  return (
    <Strip title={current === 0 ? "Upcoming" : current === allocations.length ? "Current" : "Current and Upcoming"}>
        {allocations.slice(0, MAX).map((a) => (
          <DateRow
            key={a.id}
            date={a.start}
            title={a.title || a.engagementId}
            lines={[fmtRange(a.start, a.end)]}
            right={a.status ? <AllocationStatusChip status={a.status} /> : undefined}
            to={a.canOpen || canOpen(a.engagementId) ? myEngagementPaths.allocation(a.engagementId) : undefined}
          />
        ))}
    </Strip>
  );
}

/** Trips under way or still to come (at most three, soonest first), above the Travels list; nothing when there are none. */
export function TravelsFocus({ trips }: { trips: readonly TravelRequestSummary[] }): JSX.Element | null {
  const today = localIsoDate();
  const focus = trips
    .filter((t) => t.status !== "Cancelled" && t.status !== "Completed" && t.end >= today)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
    .slice(0, MAX);
  if (!focus.length) return null;
  const ongoing = focus.filter((t) => t.start <= today).length;
  return (
    <Strip title={ongoing === 0 ? "Upcoming" : ongoing === focus.length ? "Under Way" : "Under Way and Upcoming"}>
        {focus.map((t) => (
          <DateRow
            key={t.jobNumber}
            date={t.start}
            title={place(t.country, t.city)}
            lines={[fmtRange(t.start, t.end), t.travelAgent || "No travel agent yet"]}
            right={
              <>
                <TravelStatusChip status={t.status} />
                <Mono>{t.jobNumber}</Mono>
              </>
            }
            to={myEngagementPaths.travelRequest(t.jobNumber)}
          />
        ))}
    </Strip>
  );
}
