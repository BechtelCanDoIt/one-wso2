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

import type { ReactNode } from "react";
import { Box, Chip, Link, Paper, Typography } from "@wso2/oxygen-ui";
import { ImageIcon } from "@wso2/oxygen-ui-icons-react";
import type { Campaign } from "../api/amplifyTypes";
import { linkedInPostUrl } from "../util/linkedinPost";

function postDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * One post: headline, "WSO2 on LinkedIn · date", image, chips, the 2–3 line
 * summary, and an action button. Same card on Celebrate and Current Posts;
 * only the chips and the action differ.
 */
export default function PostCard({
  campaign,
  chips,
  action,
}: {
  campaign: Campaign;
  chips?: ReactNode;
  action: ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ minWidth: 0 }}>
        <Link
          href={linkedInPostUrl(campaign.resourceUrn, campaign.resourceUrl)}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          color="text.primary"
          sx={{ fontWeight: 700, fontSize: 14, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {campaign.title}
        </Link>
        <Typography variant="caption" color="text.secondary">
          WSO2 on LinkedIn · {postDate(campaign.opensAt)}
        </Typography>
      </Box>

      <Box
        sx={{
          aspectRatio: "16 / 9",
          borderRadius: 1,
          border: "1px dashed",
          borderColor: "divider",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary",
        }}
      >
        {campaign.imageUrl ? (
          <Box
            component="img"
            src={campaign.imageUrl}
            alt=""
            loading="lazy"
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <ImageIcon size={24} aria-hidden />
        )}
      </Box>

      {chips && <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>{chips}</Box>}

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", flexGrow: 1 }}
      >
        {campaign.summary || " "}
      </Typography>

      <Box>{action}</Box>
    </Paper>
  );
}

export function PriorityChip() {
  return <Chip size="small" color="primary" label="Priority" />;
}

export function CategoryChip({ label }: { label: string }) {
  return <Chip size="small" variant="outlined" color="primary" label={label} />;
}
