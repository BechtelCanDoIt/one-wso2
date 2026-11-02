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

import { Box, Stack, Typography } from "@wso2/oxygen-ui";
import type { JSX } from "react";
import type { HistoryEntry } from "../../api/riskApi";
import { entryToSentence, TONE_COLORS } from "./historyText";
import { formatDate } from "./utils";

export default function RiskHistoryTimeline({ entries }: { entries: HistoryEntry[] }): JSX.Element {
  return (
    <Stack>
      {entries.map((e, i) => {
        const { title, body, tone } = entryToSentence(e);
        const last = i === entries.length - 1;
        return (
          <Box key={e.id} sx={{ display: "flex", gap: 1.5 }}>
            {/* Dot + connecting rail. The rail is omitted on the last entry so
                the timeline ends cleanly rather than trailing into nothing. */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.6 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: TONE_COLORS[tone],
                  flexShrink: 0,
                }}
              />
              {!last && <Box sx={{ width: "2px", flex: 1, bgcolor: "divider", mt: 0.5 }} />}
            </Box>

            <Box sx={{ pb: last ? 0 : 2, minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {title}
              </Typography>
              {body && (
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                  {body}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {formatDate(e.created_at)} · {e.created_by_email || e.created_by}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
