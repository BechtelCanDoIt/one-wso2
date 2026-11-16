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

import type { Column } from "../components/EaTable";
import type { TravelDocument, Visa } from "../api/engagementTypes";
import { ExpiresIn, Two, Mono } from "../components/StatusChips";
import { fmtDate, fmtRange } from "../model/format";

/** Active or Expired follows the end date, as the legacy screens computed it; Inactive is stored. */
export const visaStatus = (v: Visa, today: string): "Active" | "Expired" | "Inactive" =>
  v.status === "Inactive" ? "Inactive" : v.end >= today ? "Active" : "Expired";
export const documentStatus = (d: TravelDocument, today: string): "Active" | "Expired" | "Inactive" =>
  d.status === "Inactive" ? "Inactive" : !d.expires || d.expires >= today ? "Active" : "Expired";

export function visaColumns(own: boolean, today: string): Column<Visa>[] {
  return [
    ...(own ? [] : [{ key: "who", label: "Traveller", render: (v: Visa) => (v.owner ? <Two main={v.owner.name} sub={v.owner.email} /> : "—") }]),
    { key: "country", label: "Country", render: (v) => v.country },
    { key: "type", label: "Visa Type", render: (v) => v.visaType },
    { key: "entry", label: "Entry Type", render: (v) => v.entryType },
    { key: "valid", label: "Valid", render: (v) => fmtRange(v.start, v.end) },
    { key: "expires", label: "Expires In", render: (v) => <ExpiresIn end={v.end} today={today} /> },
  ];
}

export function documentColumns(own: boolean, today: string): Column<TravelDocument>[] {
  return [
    ...(own ? [] : [{ key: "who", label: "Traveller", render: (d: TravelDocument) => (d.owner ? <Two main={d.owner.name} sub={d.owner.email} /> : "—") }]),
    { key: "doc", label: "Document", render: (d) => <Two main={d.type} sub={<Mono>{d.number}</Mono>} /> },
    { key: "country", label: "Issued Country", render: (d) => d.country },
    { key: "issued", label: "Issued", render: (d) => (d.issued ? fmtDate(d.issued) : "—") },
    { key: "expiry", label: "Expiry", render: (d) => (d.expires ? fmtDate(d.expires) : "No Expire") },
    { key: "expires", label: "Expires In", render: (d) => <ExpiresIn end={d.expires} today={today} /> },
  ];
}
