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
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { PlusIcon } from "@wso2/oxygen-ui-icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { archiveCampaign } from "../api/amplifyClient";
import { useIdempotencyKey } from "../api/idempotency";
import type { Campaign } from "../api/amplifyTypes";
import { AMPLIFY_QUERY_KEYS, useAmplifyCampaigns } from "../api/amplifyHooks";
import AmplifyShell, { AmplifyEmpty } from "../components/AmplifyShell";
import AmplifySectionCard from "../components/AmplifySectionCard";
import CampaignFormDialog from "../components/CampaignFormDialog";
import { amplifyBtnSx, campaignStatusColor, formatDate } from "../components/amplifyUi";

/**
 * The contract's `status` values for `GET /campaigns` (lower case), plus `all`.
 * PO and Marketing may ask for any status; everyone else only ever sees `open`.
 */
const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "scheduled", label: "Scheduled" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

const ROWS_PER_PAGE = [10, 25, 50];

/**
 * Campaigns — the marketing team's list, with create, edit and archive.
 *
 * Archive is a warning, not a checkbox: it takes a campaign out of the feed
 * everyone was amplifying, so the dialog says so in plain words and asks again.
 * The list opens on all statuses so the closed and archived rows are reachable
 * (the API's own default is `open` only, which would hide the ones you most
 * often need to fix).
 */
export default function AmplifyCampaignsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | undefined>(undefined);
  const [archiving, setArchiving] = useState<Campaign | undefined>(undefined);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);

  const query = useAmplifyCampaigns({ status, page, size });

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (c: Campaign) => {
    setEditing(c);
    setFormOpen(true);
  };

  return (
    <AmplifyShell
      title="Campaigns"
      subtitle="What the company is asking people to amplify, and when."
      // Campaign editing is PO and Marketing alike (A6, `CAMPAIGN_EDITORS`).
      requireRole={["marketing", "po"]}
    >
      {() => (
        <Box>
          <AmplifySectionCard
            title="All campaigns"
            action={
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(0);
                  }}
                  sx={{ minWidth: 160 }}
                >
                  {STATUS_FILTERS.map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </TextField>
                <Button variant="contained" size="small" startIcon={<PlusIcon size={16} />} onClick={openCreate} sx={amplifyBtnSx}>
                  New campaign
                </Button>
              </Stack>
            }
          >
            {query.isError ? (
              <Alert severity="error">{describeError(query.error)}</Alert>
            ) : query.isPending ? (
              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Loading campaigns…
                </Typography>
              </Stack>
            ) : (query.data?.items.length ?? 0) === 0 ? (
              <AmplifyEmpty>No campaigns match that filter.</AmplifyEmpty>
            ) : (
              <>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Window</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(query.data?.items ?? []).map((c) => (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {c.title}
                            </Typography>
                            {c.isPriority && <Chip size="small" color="warning" label="Priority" />}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {c.categoryCode}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" color={campaignStatusColor(c.status)} label={c.status} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {formatDate(c.opensAt)} → {formatDate(c.closesAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                            {/* PATCH refuses an archived campaign, so Edit is closed on one too. */}
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openEdit(c)}
                              disabled={c.status === "ARCHIVED"}
                              sx={amplifyBtnSx}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => setArchiving(c)}
                              disabled={c.status === "ARCHIVED"}
                              sx={amplifyBtnSx}
                            >
                              Archive
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  count={query.data?.total ?? 0}
                  page={page}
                  rowsPerPage={size}
                  rowsPerPageOptions={ROWS_PER_PAGE}
                  onPageChange={(_, next) => setPage(next)}
                  onRowsPerPageChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(0);
                  }}
                />
              </>
            )}
          </AmplifySectionCard>

          <CampaignFormDialog open={formOpen} campaign={editing} onClose={() => setFormOpen(false)} />
          <ArchiveDialog campaign={archiving} onClose={() => setArchiving(undefined)} />
        </Box>
      )}
    </AmplifyShell>
  );
}

function ArchiveDialog({ campaign, onClose }: { campaign?: Campaign; onClose: () => void }) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();
  const [busy, setBusy] = useState(false);
  const idempotency = useIdempotencyKey();

  const handleArchive = async () => {
    if (!campaign) return;
    setBusy(true);
    const key = idempotency.keyFor({ archive: campaign.id });
    try {
      const token = await getAccessToken();
      await archiveCampaign(token, campaign.id, key);
      idempotency.settle();
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.campaigns });
      showSuccess(`Archived “${campaign.title}”.`);
      onClose();
    } catch (err) {
      idempotency.settle(err);
      showError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(campaign)} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Archive “{campaign?.title}”?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Archiving takes this campaign out of everyone's Posts feed immediately.
          People who have already shared it keep their points — nothing is
          reversed by archiving. This cannot be undone from here.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} sx={amplifyBtnSx}>
          Cancel
        </Button>
        <Button onClick={handleArchive} color="error" variant="contained" disabled={busy} sx={amplifyBtnSx}>
          {busy ? "Archiving…" : "Archive"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
