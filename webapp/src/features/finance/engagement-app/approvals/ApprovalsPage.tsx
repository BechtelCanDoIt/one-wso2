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
import { Navigate, useNavigate } from "react-router";
import RoutedTabs from "@components/routed-tabs/RoutedTabs";
import type { EngagementSummary } from "../api/engagementTypes";
import { useApprovals } from "../api/useEngagementApi";
import { useEngagementAccess } from "../api/useEngagementUserInfo";
import EaPage from "../components/EaPage";
import EaTable, { type Column } from "../components/EaTable";
import { Empty, Failed, ListCard } from "../components/ListCard";
import ListToolbar from "../components/ListToolbar";
import { Two, Mono } from "../components/StatusChips";
import { engagementPaths, type ApprovalSegment } from "../engagementPaths";
import { ALLOC, type EngagementAccess } from "../model/engagementAccess";
import { fmtDate, fmtRange, place } from "../model/format";
import { PAGE_SIZE, useListView } from "../model/useListView";
import { useEngagementActions } from "../engagements/useEngagementActions";

const segmentsOf = (access: EngagementAccess): ApprovalSegment[] => [
  ...(access.p.a.has(ALLOC.APPROVE_INTERNAL_VIEW) ? (["internal"] as const) : []),
  ...(access.p.a.has(ALLOC.APPROVE_MARKETING_VIEW) ? (["marketing"] as const) : []),
];

/** `/approvals`: the first tab this person may open. */
export function ApprovalsIndex(): JSX.Element {
  const access = useEngagementAccess();
  return <Navigate to={engagementPaths.approvals(segmentsOf(access)[0] ?? "internal")} replace />;
}

/** The legacy Approve page with its two tabs: the internal engagements and marketing events still in Pending Approval, oldest first. */
export default function ApprovalsPage({ segment }: { segment: ApprovalSegment }): JSX.Element {
  const access = useEngagementAccess();
  const segments = segmentsOf(access);
  const navigate = useNavigate();
  const list = useListView();
  const mkt = segment === "marketing";
  const query = useApprovals(mkt ? "events" : "internal", list.paramsFor(), segments.includes(segment));
  const { actionsFor, dialogs } = useEngagementActions();

  if (!segments.includes(segment)) return <Navigate to={engagementPaths.approvals(segments[0])} replace />;

  // The backend searches, pages and keeps the legacy oldest-first order.
  const rows = query.data?.items ?? [];

  const columns: Column<EngagementSummary>[] = [
    { key: "e", label: mkt ? "Event" : "Engagement", width: "24%", render: (e) => <Two main={<Mono>{e.id}</Mono>} sub={e.title} /> },
    { key: "type", label: mkt ? "Event Type" : "Allocation Type", render: (e) => <Two main={e.allocationType} sub={<Mono>{e.code}</Mono>} /> },
    { key: "loc", label: "Location", render: (e) => <Two main={place(e.country, e.city)} sub={e.nature} /> },
    { key: "dates", label: "Dates", render: (e) => <span style={{ whiteSpace: "nowrap" }}>{fmtRange(e.start, e.end)}</span> },
    mkt
      ? {
          key: "funding",
          label: "Funding",
          render: (e) => (
            <>
              {(e.funding ?? []).map((f, i) => (
                <div key={i}>{`${f.businessUnit} ${f.percentage}%`}</div>
              ))}
            </>
          ),
        }
      : { key: "bu", label: "Business Unit", render: (e) => e.businessUnit || "—" },
    { key: "by", label: "Created By", render: (e) => <Two main={<span style={{ whiteSpace: "nowrap" }}>{e.createdBy?.name ?? "—"}</span>} sub={e.createdOn ? fmtDate(e.createdOn) : undefined} /> },
  ];

  const what = segments.length > 1 ? "Internal engagements and marketing events" : mkt ? "Marketing events" : "Internal engagements";
  const counts = query.data?.counts;
  const count = (key: string) => {
    const n = counts?.[key] ?? (key === (mkt ? "events" : "internal") && !list.search ? query.data?.total : undefined);
    return n === undefined ? undefined : { label: String(n), reason: `${n} waiting for approval` };
  };

  return (
    <EaPage title="Approvals" subtitle={`${what} waiting for approval. People can be allocated once they are approved.`}>
      <ListCard>
        {segments.length > 1 ? (
          <RoutedTabs
            basePath={engagementPaths.approvals()}
            ariaLabel="Approval kinds"
            tabs={[
              { segment: "internal", label: "Internal Engagements", badge: count("internal") },
              { segment: "marketing", label: "Marketing Events", badge: count("events") },
            ]}
          />
        ) : null}
        <ListToolbar search={list.search} placeholder={mkt ? "Search events" : "Search engagements"} onSearch={list.setSearch} />
        {query.isError ? (
          <Failed what="the approvals" error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        ) : (
          <EaTable
            ariaLabel="Waiting for approval"
            columns={columns}
            rows={rows}
            rowKey={(e) => e.id}
            loading={query.isPending || query.isPlaceholderData}
            pagination={{ page: list.page, pageSize: PAGE_SIZE, total: query.data?.total ?? 0, onPage: list.setPage }}
            onRowClick={(e) => navigate(engagementPaths.engagement(e.id))}
            primaryAction={(e) => {
              const a = actionsFor(e);
              // Someone who can edit but not approve gets Edit as the row's button.
              return a.primary ?? (a.menu.length === 1 ? a.menu[0] : undefined);
            }}
            menu={(e) => {
              const a = actionsFor(e);
              return a.primary ? a.menu : a.menu.length === 1 ? [] : a.menu;
            }}
            empty={
              <Empty
                title={list.search ? "Nothing Matches the Search" : mkt ? "No Marketing Events Waiting" : "No Internal Engagements Waiting"}
                body={list.search ? "Change the search to see more." : "New ones appear here as soon as they are created."}
              />
            }
          />
        )}
      </ListCard>
      {dialogs}
    </EaPage>
  );
}
