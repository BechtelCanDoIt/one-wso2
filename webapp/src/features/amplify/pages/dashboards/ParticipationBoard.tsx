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
import { Box, ButtonBase, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@wso2/oxygen-ui";
import type { DashboardParticipation, GroupBoard, GroupSort, SortDir } from "../../api/amplifyTypes";
import { useDashboardParticipation, useGroupBoard } from "../../api/useAmplifyDashboards";
import AmplifyShell from "../../components/AmplifyShell";
import { Bar, Block, BoardState, Empty } from "../../components/DashboardParts";
import { nextSort, updatedStamp, num, percentOf, rate } from "../../util/dashboardFormat";

/** Employees → connected → reposted → active: where people drop out. */
export function Funnel({ data }: { data: DashboardParticipation }) {
  const f = data.funnel;
  const top = f.employees && f.employees > 0 ? f.employees : Math.max(1, f.connected);
  const steps: { name: string; value: number; detail: string; color?: string }[] = [];
  if (f.employees != null) {
    steps.push({ name: "Employees", value: f.employees, detail: num(f.employees), color: "text.disabled" });
  }
  steps.push({
    name: "Connected LinkedIn",
    value: f.connected,
    detail: f.employees ? `${num(f.connected)} · ${percentOf(f.connected, f.employees)}` : num(f.connected),
  });
  steps.push({
    name: "Reposted at least once",
    value: f.reposted,
    detail: `${num(f.reposted)} · ${percentOf(f.reposted, f.connected)} of connected`,
  });
  steps.push({
    name: "Active in last 30 days",
    value: f.active30Days,
    detail: `${num(f.active30Days)} · ${percentOf(f.active30Days, f.connected)} of connected`,
    color: "primary.main",
  });
  return (
    <Block title="Employee journey">
      <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {steps.map((s) => (
          <Box component="li" key={s.name} sx={{ display: "flex", alignItems: "center", gap: 1.75, flexWrap: "wrap" }}>
            <Box sx={{ flex: "0 0 170px" }}>{s.name}</Box>
            <Bar fraction={s.value / top} label={`${s.name}: ${s.value}`} color={s.color} />
            <Box sx={{ flex: "0 0 190px", fontSize: 14 }}>{s.detail}</Box>
          </Box>
        ))}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {num(f.expired)} connections have expired.
        {f.employees != null && f.employees > f.connected
          ? ` ${num(f.employees - f.connected)} employees have never connected.`
          : ""}
      </Typography>
    </Block>
  );
}

interface Column {
  key: GroupSort | "bu";
  label: string;
  numeric: boolean;
  align?: "right";
  sortable: boolean;
}

const COLUMNS: Column[] = [
  { key: "rank", label: "#", numeric: true, sortable: true },
  { key: "name", label: "Team", numeric: false, sortable: true },
  { key: "bu", label: "BU", numeric: false, sortable: false },
  { key: "points", label: "Points", numeric: true, align: "right", sortable: true },
  { key: "participants", label: "Participants", numeric: true, align: "right", sortable: true },
  { key: "headcount", label: "Headcount", numeric: true, align: "right", sortable: true },
  { key: "participation", label: "Participation", numeric: true, sortable: true },
];

/** The teams of one business unit, ranked; every sortable header is a button that sorts on the server. */
export function TeamTable({
  board,
  bus,
  bu,
  onBu,
  sort,
  dir,
  onSort,
}: {
  board: GroupBoard | undefined;
  /** Business units in rank order (best first). */
  bus: string[];
  /** The one selected BU. */
  bu: string | undefined;
  onBu: (bu: string) => void;
  sort: GroupSort;
  dir: SortDir;
  onSort: (col: GroupSort) => void;
}) {
  return (
    <Block
      title="Team leaderboard"
      action={
        <Box role="group" aria-label="Business unit" sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          {bus.map((b) => (
            <Chip
              key={b}
              size="small"
              label={b}
              color={bu === b ? "primary" : "default"}
              variant={bu === b ? "filled" : "outlined"}
              onClick={() => onBu(b)}
              aria-pressed={bu === b}
            />
          ))}
        </Box>
      }
    >
      {!board || board.entries.length === 0 ? (
        <Empty>No teams to show.</Empty>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                {COLUMNS.map((c) => {
                  const active = c.sortable && sort === c.key;
                  return (
                    <TableCell
                      key={c.key}
                      align={c.align}
                      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : c.sortable ? "none" : undefined}
                    >
                      {c.sortable ? (
                        <ButtonBase
                          onClick={() => onSort(c.key as GroupSort)}
                          sx={{ font: "inherit", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 0.5 }}
                        >
                          {c.label}
                          <span aria-hidden="true" style={{ width: 12, display: "inline-block" }}>
                            {active ? (dir === "asc" ? "↑" : "↓") : ""}
                          </span>
                        </ButtonBase>
                      ) : (
                        c.label
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {board.entries.map((e) => (
                <TableRow key={e.key}>
                  <TableCell>{e.rank}</TableCell>
                  <TableCell>{e.name}</TableCell>
                  <TableCell>{e.businessUnit ?? "-"}</TableCell>
                  <TableCell align="right">{num(e.points)}</TableCell>
                  <TableCell align="right">{num(e.participants)}</TableCell>
                  <TableCell align="right">{num(e.headcount)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ flex: "0 0 90px", display: "flex" }}>
                        <Bar fraction={e.participationRate} label={rate(e.participationRate)} />
                      </Box>
                      {rate(e.participationRate)}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
      {board && board.unassigned.participants > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {num(board.unassigned.participants)} people with {num(board.unassigned.points)} points aren&apos;t placed in a
          team by the people directory.
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Points are all-time. Participation is people with points out of team headcount.
      </Typography>
    </Block>
  );
}

export default function ParticipationPage() {
  const funnel = useDashboardParticipation();
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const [order, setOrder] = useState<{ sort: GroupSort; dir: SortDir }>({ sort: "rank", dir: "asc" });
  const bus = useGroupBoard("BU");
  // Best-ranked BU first; the first one is selected until the reader picks another.
  const buNames = (bus.data?.entries ?? []).map((e) => e.name);
  const bu = picked && buNames.includes(picked) ? picked : buNames[0];
  const teams = useGroupBoard("TEAM", bu, order.sort, order.dir, bu !== undefined);
  return (
    <AmplifyShell
      title="Participation"
      subtitle="Where employees drop out between hearing of Amplify and reposting regularly, and which teams lead."
    >
      <BoardState queries={[funnel]}>
        {funnel.data && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {updatedStamp(funnel.data.asOf)}
            </Typography>
            <Funnel data={funnel.data} />
            <BoardState queries={bus.data && buNames.length === 0 ? [bus] : [bus, teams]}>
              <TeamTable
                board={teams.data}
                bus={buNames}
                bu={bu}
                onBu={setPicked}
                sort={order.sort}
                dir={order.dir}
                onSort={(col) => setOrder((cur) => nextSort(cur, col))}
              />
            </BoardState>
          </Box>
        )}
      </BoardState>
    </AmplifyShell>
  );
}
