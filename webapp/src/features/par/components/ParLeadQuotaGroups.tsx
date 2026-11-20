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

import { Accordion, AccordionDetails, AccordionSummary, Box, Card, Chip, Stack, Typography } from "@wso2/oxygen-ui";
import { ChevronDownIcon } from "@wso2/oxygen-ui-icons-react";
import { groupSpecialRatingAllocations } from "../util/parSpecialRatingAllocation";
import type { ParSpecialRatingAllocation } from "../api/types";

// The lead's quotas, one row each: its name, how many teams share it and its Top 5% and Top 20% allocation,
// opening to the teams. The first is open. People Ops' view, with search, business unit and department, is
// ParAllocationGroupsList.
export default function ParLeadQuotaGroups({ rows }: { rows: ParSpecialRatingAllocation[] }) {
  const groups = groupSpecialRatingAllocations(rows, "");
  // 1 and 0 is a small team's single slot, for either Top 5% or Top 20%.
  const oneSlot = (group: (typeof groups)[number]) => group.top5Quota === 1 && group.top20Quota === 0;

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Each quota is shared by the teams listed under it.
      </Typography>
      <Card variant="outlined">
        {groups.map((group, index) => {
          // A team can come once per department or sub-team; it's listed once.
          const teams = [...new Set(group.departments.map((d) => d.parTeam))];
          return (
            <Accordion key={group.quotaId} elevation={0} square disableGutters defaultExpanded={index === 0}>
              <AccordionSummary expandIcon={<ChevronDownIcon size={18} />}>
                <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, width: "100%", pr: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, textTransform: "capitalize", wordBreak: "break-word" }}>
                      {group.quotaName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {teams.length === 1 ? "1 team" : `${teams.length} teams`}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {oneSlot(group) ? (
                      <QuotaChip label="Top 5% or 20% · 1" />
                    ) : (
                      <>
                        <QuotaChip label={`Top 5% · ${group.top5Quota}`} />
                        <QuotaChip label={`Top 20% · ${group.top20Quota}`} />
                      </>
                    )}
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", columns: { xs: 1, sm: 2 }, columnGap: 3 }}>
                  {teams.map((team) => (
                    <Typography key={team} component="li" variant="body2" sx={{ py: 0.5, breakInside: "avoid" }}>
                      {team}
                    </Typography>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Card>
      {groups.some(oneSlot) && (
        <Typography variant="body2" color="text.secondary">
          A small team has one slot: one person can be placed in Top 5% or Top 20%, not one in each.
        </Typography>
      )}
    </Stack>
  );
}

function QuotaChip({ label }: { label: string }) {
  return <Chip size="small" variant="outlined" color="primary" label={label} sx={{ fontWeight: 600 }} />;
}
