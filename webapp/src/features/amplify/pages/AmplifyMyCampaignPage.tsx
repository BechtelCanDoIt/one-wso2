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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { ExternalLinkIcon } from "@wso2/oxygen-ui-icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { amplifyProblemCode, claimExternalShare } from "../api/amplifyClient";
import { AMPLIFY_PROBLEM, type ExternalShareStatus } from "../api/amplifyTypes";
import { AMPLIFY_QUERY_KEYS, useAmplifyCampaigns, useAmplifyMyExternalShares } from "../api/amplifyHooks";
import AmplifyShell, { AmplifyEmpty } from "../components/AmplifyShell";
import AmplifySectionCard from "../components/AmplifySectionCard";
import { amplifyBtnSx, externalShareStatusColor, formatDateTime } from "../components/amplifyUi";

/**
 * My Campaign — post on LinkedIn yourself, then claim it here for points.
 *
 * The claim is the whole point, so it is one small form: paste the post's URL,
 * tick the certification, optionally attach it to a campaign. The
 * `EVIDENCE_ALREADY_CLAIMED` problem code gets its own sentence because it is
 * the one failure a reader can act on ("you already claimed this") and the one
 * they are most likely to hit by pasting twice.
 */
export default function AmplifyMyCampaignPage() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showSuccess } = useNotifications();

  const campaigns = useAmplifyCampaigns({ status: "OPEN", size: 100 });
  const portfolio = useAmplifyMyExternalShares();

  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [certified, setCertified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!evidenceUrl.trim()) {
      setError("Paste the URL of your LinkedIn post.");
      return;
    }
    if (!certified) {
      setError("Tick the box to certify that this post is yours and is public.");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      const created = await claimExternalShare(token, {
        evidenceUrl: evidenceUrl.trim(),
        certified: true,
        campaignId: campaignId || undefined,
      });
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.myExternalShares });
      showSuccess(
        created.status === "PENDING"
          ? "Claim submitted — it's in the review queue."
          : `Claim recorded (${created.status.toLowerCase()}).`,
      );
      setEvidenceUrl("");
      setCertified(false);
    } catch (err) {
      setError(claimErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AmplifyShell
      title="My Campaign"
      subtitle="Posted about WSO2 on your own account? Claim it here so it counts toward your points."
    >
      {() => (
        <Box>
          <AmplifySectionCard title="Submit a post" caption="Your own LinkedIn post, published publicly.">
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  fullWidth
                  size="small"
                  label="Post URL"
                  placeholder="https://www.linkedin.com/posts/…"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                />
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Campaign (optional)"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  helperText="Attach it to a running campaign so it counts toward that campaign too."
                >
                  <MenuItem value="">No campaign</MenuItem>
                  {(campaigns.data?.items ?? []).map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.title}
                    </MenuItem>
                  ))}
                </TextField>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={certified}
                      onChange={(e) => setCertified(e.target.checked)}
                    />
                  }
                  label="I certify this post is mine and visible to everyone."
                />
                <Box>
                  <Button type="submit" variant="contained" disabled={submitting} sx={amplifyBtnSx}>
                    {submitting ? "Submitting…" : "Submit claim"}
                  </Button>
                </Box>
              </Stack>
            </Box>
          </AmplifySectionCard>

          <AmplifySectionCard title="Your posts" caption="Everything you have claimed.">
            {portfolio.isError ? (
              <Alert severity="error">{describeError(portfolio.error)}</Alert>
            ) : (portfolio.data?.items.length ?? 0) === 0 ? (
              <AmplifyEmpty>You haven't claimed any posts yet.</AmplifyEmpty>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Post</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Claimed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(portfolio.data?.items ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", minWidth: 0 }}>
                          <ExternalLinkIcon size={14} />
                          <Typography
                            variant="body2"
                            component="a"
                            href={s.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "inherit",
                            }}
                          >
                            {s.evidenceUrl}
                          </Typography>
                        </Stack>
                        {s.decisionReason && (
                          <Typography variant="caption" color="text.secondary">
                            {s.decisionReason}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={externalShareStatusColor(s.status)} label={statusLabel(s.status)} />
                      </TableCell>
                      <TableCell>{formatDateTime(s.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AmplifySectionCard>
        </Box>
      )}
    </AmplifyShell>
  );
}

function statusLabel(status: ExternalShareStatus): string {
  switch (status) {
    case "PENDING":
      return "In review";
    case "APPROVED":
      return "Approved";
    case "AMPLIFIED":
      return "Amplified";
    case "REJECTED":
      return "Rejected";
  }
}

/** The claim failures a reader can do something about, in their own words. */
function claimErrorMessage(err: unknown): string {
  switch (amplifyProblemCode(err)) {
    case AMPLIFY_PROBLEM.evidenceAlreadyClaimed:
      return "You've already claimed this post. Points have been counted once — you don't need to submit it again.";
    case AMPLIFY_PROBLEM.notWso2Resource:
      return "That post doesn't look like it's about WSO2. Check you pasted the right link.";
    case AMPLIFY_PROBLEM.certificationRequired:
      return "Tick the certification box to submit.";
    case AMPLIFY_PROBLEM.invalidEvidenceUrl:
      return "That doesn't look like a valid post URL. Paste the full link.";
    default:
      return describeError(err);
  }
}
