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
import { Typography } from "@wso2/oxygen-ui";
import type { Allocation } from "../api/engagementTypes";
import { engagementPaths } from "../engagementPaths";
import JobLink from "../invoices/JobLink";

/** "09:00 – 11:00 (Asia/Colombo)" for an hourly allocation, else nothing. */
export function HourlyLabel({ allocation }: { allocation: Allocation }): JSX.Element | null {
  const h = allocation.hourly;
  return h ? <>{`${h.from} – ${h.to} (${h.timeZone})`}</> : null;
}

/** The Travel column: the travel request it created (a link when the viewer may open it), Not Raised while it has not been, or Not Required. */
export function TravelCell({ allocation, travelBase = engagementPaths.travelRequest }: { allocation: Allocation; travelBase?: (job: string) => string }): JSX.Element {
  const a = allocation;
  if (a.travelRequired !== "Yes") return <Muted>Not Required</Muted>;
  if (a.travelRequest) {
    return (
      <JobLink job={a.travelRequest} to={travelBase} />
    );
  }
  return a.travelRaised ? <>Yes</> : <Muted>Not Raised</Muted>;
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <Typography component="span" sx={{ fontSize: 13, color: "text.secondary" }}>
      {children}
    </Typography>
  );
}
