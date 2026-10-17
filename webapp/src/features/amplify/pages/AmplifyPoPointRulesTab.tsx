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

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { PlusIcon } from "@wso2/oxygen-ui-icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { describeError } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { createPointRule } from "../api/amplifyClient";
import { useIdempotencyKey } from "../api/idempotency";
import { pointRuleBody } from "../components/amplifyForms";
import type { PointAction } from "../api/amplifyTypes";
import { AMPLIFY_QUERY_KEYS, useAmplifyPointRules } from "../api/amplifyHooks";
import AmplifySectionCard from "../components/AmplifySectionCard";
import { amplifyBtnSx, formatDate } from "../components/amplifyUi";

const ACTIONS: PointAction[] = [
  "REPOST",
  "REPOST_COMMENTARY",
  "SHARE",
  "SHARE_COMMENTARY",
  "OWN_POST",
  "OWN_POST_AMPLIFIED",
];

/**
 * Point rules. A rule is versioned by its `effectiveFrom` date, so "in force"
 * is a property of time, not a toggle — the table shows which one is live and
 * lets a new one be scheduled.
 */
export default function AmplifyPoPointRulesTab() {
  const query = useAmplifyPointRules();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <Box>
      <AmplifySectionCard
        title="Point rules"
        caption="What each action is worth. A new rule takes effect from its date, and past points are never recalculated."
        action={
          <Button variant="contained" size="small" startIcon={<PlusIcon size={16} />} onClick={() => setFormOpen(true)}>
            New rule
          </Button>
        }
      >
        {query.isError ? (
          <Alert severity="error">{describeError(query.error)}</Alert>
        ) : query.isPending ? (
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading point rules…
            </Typography>
          </Stack>
        ) : (query.data?.rules.length ?? 0) === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No point rules defined.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Action</TableCell>
                <TableCell align="right">Points</TableCell>
                <TableCell>Effective from</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created by</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(query.data?.rules ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.action.replace(/_/g, " ")}</TableCell>
                  <TableCell align="right">{r.points}</TableCell>
                  <TableCell>{formatDate(r.effectiveFrom)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={r.inForce ? "success" : "default"}
                      variant={r.inForce ? "filled" : "outlined"}
                      label={r.inForce ? "In force" : "Scheduled"}
                    />
                  </TableCell>
                  <TableCell>{r.createdBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AmplifySectionCard>

      <PointRuleDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </Box>
  );
}

function PointRuleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const { showSuccess } = useNotifications();
  const [action, setAction] = useState<PointAction>("REPOST");
  const [points, setPoints] = useState("10");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotency = useIdempotencyKey();

  useEffect(() => {
    if (!open) return;
    setError(null);
    idempotency.reset();
  }, [open, idempotency]);

  const handleSubmit = async () => {
    const built = pointRuleBody(action, points, effectiveFrom);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    setBusy(true);
    setError(null);
    const key = idempotency.keyFor(built.body);
    try {
      const token = await getAccessToken();
      await createPointRule(token, built.body, key);
      idempotency.settle();
      void queryClient.invalidateQueries({ queryKey: AMPLIFY_QUERY_KEYS.pointRules });
      showSuccess("Point rule added.");
      setEffectiveFrom("");
      onClose();
    } catch (err) {
      idempotency.settle(err);
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>New point rule</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            select
            fullWidth
            size="small"
            label="Action"
            value={action}
            onChange={(e) => setAction(e.target.value as PointAction)}
          >
            {ACTIONS.map((a) => (
              <MenuItem key={a} value={a}>
                {a.replace(/_/g, " ")}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Points"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            type="datetime-local"
            label="Effective from"
            helperText="Leave blank to start now. Past points are never recalculated."
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} sx={amplifyBtnSx}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={busy} sx={amplifyBtnSx}>
          {busy ? "Saving…" : "Add rule"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
