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
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Pagination,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@wso2/oxygen-ui";
import { LayoutGridIcon, ListIcon, PlusIcon } from "@wso2/oxygen-ui-icons-react";
import { useNavigate } from "react-router";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { AMPLIFY_PATHS } from "@constants/amplifyApps";
import { useAmplifyCampaigns, useAmplifyTags } from "../api/amplifyHooks";
import type { Campaign } from "../api/amplifyTypes";
import type { AmplifyGate } from "../api/useAmplifyGate";
import AmplifyShell, { AmplifyEmpty } from "../components/AmplifyShell";
import AmplifyShareButton from "../components/AmplifyShareButton";
import { amplifyBtnSx, formatDate, relativeTime } from "../components/amplifyUi";

const PAGE_SIZE = 9;

/**
 * The Posts feed — every open campaign, as thumbnails or a compact list.
 *
 * This is where Amplify opens (the perspective forwards to it), so it does the
 * least assuming: one request, one filter, one pager, and the share button on
 * every row. "You are all caught up" is a first-class state, not an empty
 * table — an employee who has amplified everything on offer should read as
 * finished, not as broken.
 */
export default function AmplifyPostsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [tag, setTag] = useState<string>("");
  const [page, setPage] = useState(1);

  const tags = useAmplifyTags();
  const query = useAmplifyCampaigns({ status: "OPEN", tag: tag || undefined, page, size: PAGE_SIZE });

  return (
    <AmplifyShell
      title="Posts"
      subtitle="Everything the company is asking you to amplify right now. Amplify one to share it on LinkedIn."
    >
      {(gate) => {
        const items = query.data?.items ?? [];
        const total = query.data?.total ?? 0;
        const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

        return (
          <Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", mb: 2 }}
            >
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, alignItems: "center" }}>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                  Filter by tag:
                </Typography>
                <Chip
                  size="small"
                  label="All"
                  color={tag === "" ? "primary" : "default"}
                  variant={tag === "" ? "filled" : "outlined"}
                  onClick={() => {
                    setTag("");
                    setPage(1);
                  }}
                />
                {(tags.data?.tags ?? []).map((t) => (
                  <Chip
                    key={t}
                    size="small"
                    label={t}
                    color={tag === t ? "primary" : "default"}
                    variant={tag === t ? "filled" : "outlined"}
                    onClick={() => {
                      setTag(t);
                      setPage(1);
                    }}
                  />
                ))}
              </Stack>

              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={view}
                  onChange={(_e, next: "grid" | "list" | null) => next && setView(next)}
                >
                  <ToggleButton value="grid" aria-label="Thumbnails">
                    <LayoutGridIcon size={16} />
                  </ToggleButton>
                  <ToggleButton value="list" aria-label="List">
                    <ListIcon size={16} />
                  </ToggleButton>
                </ToggleButtonGroup>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PlusIcon size={16} />}
                  onClick={() => navigate(AMPLIFY_PATHS.myCampaign)}
                  sx={amplifyBtnSx}
                >
                  Make a post
                </Button>
              </Stack>
            </Stack>

            {query.isError && (
              <ErrorNotice error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching}>
                Couldn't load the campaigns.
              </ErrorNotice>
            )}

            {query.isPending ? (
              <LoadingRow />
            ) : items.length === 0 ? (
              <AmplifyEmpty>
                You are all caught up — there's nothing left to amplify right now. New campaigns
                show up here as soon as they open.
              </AmplifyEmpty>
            ) : view === "grid" ? (
              <Grid items={items} gate={gate} />
            ) : (
              <ListView items={items} gate={gate} />
            )}

            {pageCount > 1 && (
              <Stack sx={{ alignItems: "center", mt: 3 }}>
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_e, p) => setPage(p)}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Stack>
            )}
          </Box>
        );
      }}
    </AmplifyShell>
  );
}

function LoadingRow() {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: 2 }}>
      <CircularProgress size={16} />
      <Typography variant="body2" color="text.secondary">
        Loading campaigns…
      </Typography>
    </Stack>
  );
}

function Grid({ items, gate }: { items: Campaign[]; gate: AmplifyGate }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
        gap: 2,
      }}
    >
      {items.map((c) => (
        <Card key={c.id} variant="outlined" sx={{ display: "flex", flexDirection: "column" }}>
          <Thumbnail campaign={c} />
          <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.25 }}>
              {c.title}
            </Typography>
            {c.summary && (
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {c.summary}
              </Typography>
            )}
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", rowGap: 0.75 }}>
              {c.isPriority && <Chip size="small" color="warning" label="Priority" />}
              <Chip size="small" variant="outlined" label={c.categoryCode} />
              {c.tags.slice(0, 2).map((t) => (
                <Chip key={t} size="small" variant="outlined" label={`#${t}`} />
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Closes {relativeTime(c.closesAt)}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <AmplifyShareButton campaign={c} gate={gate} fullWidth />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

function Thumbnail({ campaign }: { campaign: Campaign }) {
  if (campaign.imageUrl) {
    return (
      <Box
        component="img"
        src={campaign.imageUrl}
        alt=""
        sx={{ width: "100%", height: 150, objectFit: "cover", display: "block" }}
      />
    );
  }
  return (
    <Box
      sx={{
        width: "100%",
        height: 150,
        bgcolor: "action.hover",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography variant="h6" color="text.disabled">
        {campaign.categoryCode}
      </Typography>
    </Box>
  );
}

function ListView({ items, gate }: { items: Campaign[]; gate: AmplifyGate }) {
  return (
    <Stack spacing={1.25}>
      {items.map((c) => (
        <Card key={c.id} variant="outlined">
          <CardContent sx={{ display: "flex", gap: 2, alignItems: "center", py: 1.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {c.title}
                </Typography>
                {c.isPriority && <Chip size="small" color="warning" label="Priority" />}
                <Chip size="small" variant="outlined" label={c.categoryCode} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {c.summary ? `${c.summary} · ` : ""}Closes {formatDate(c.closesAt)}
              </Typography>
            </Box>
            <AmplifyShareButton campaign={c} gate={gate} />
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
