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

import { useState, type JSX } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from "@wso2/oxygen-ui";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import type { ApprovalPreview } from "@features/sales/cado2/approvals/api/approvalTypes";
import MatrixGrid from "@features/sales/cado2/approvals/components/MatrixGrid";
import { matrixRows, placementsOf, type GroupPlacement } from "@features/sales/cado2/approvals/model/matrixGrid";

interface DiscountMatrixDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** The quote's approval preview, which carries the matrix and its lines (D176). */
  readonly preview: ApprovalPreview | undefined;
  readonly loading: boolean;
  readonly error: Error | null;
}

/**
 * "Discount approval matrix" beside the products (D176): the matrix as the
 * Admin saved it, laid out like Sales' sheet, with this quote's lines on it.
 * The rows the quote uses are highlighted, and the highest approver each
 * needs is circled. Lines no group covers are listed under it.
 */
export default function DiscountMatrixDialog({ open, onClose, preview, loading, error }: DiscountMatrixDialogProps): JSX.Element {
  const [onlyQuote, setOnlyQuote] = useState(false);
  // Worked out only while open: the preview behind it may still be loading.
  const shown = open ? preview : undefined;
  const matrix = shown?.matrix ?? null;
  const placements = shown ? placementsOf(shown) : new Map<string, GroupPlacement>();
  const rows = matrix ? matrixRows(matrix).filter((r) => !onlyQuote || placements.has(r.code)) : [];
  const uncovered = (shown?.lines ?? []).filter((l) => !l.groupCode);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" aria-labelledby="discount-matrix-title">
      <DialogTitle id="discount-matrix-title">
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
          <span>Discount approval matrix</span>
          {matrix ? (
            <FormControlLabel
              control={<Checkbox size="small" checked={onlyQuote} onChange={(e) => setOnlyQuote(e.target.checked)} />}
              label={<Typography variant="body2">Only this quote&apos;s groups</Typography>}
            />
          ) : null}
        </Stack>
      </DialogTitle>
      <DialogContent>
        {loading && !matrix ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress aria-label="Loading the matrix" />
          </Box>
        ) : error ? (
          <ErrorNotice error={error}>Couldn&apos;t load the matrix.</ErrorNotice>
        ) : !matrix ? (
          <Alert severity="info">
            {shown?.invalid[0]?.message ?? "Choose the account and opportunity, and add products, to see the matrix."}
          </Alert>
        ) : (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              As the Admin set it. Deal Desk reviews first, then each approver in order. The limits compare each line&apos;s
              discount above its volume discount ceiling. Highlighted: the groups on this quote, with the highest approver
              each needs circled.
            </Typography>
            <MatrixGrid rows={rows} roles={matrix.roles} placements={placements} />
            {uncovered.length ? (
              <Alert severity="warning">
                No discount group covers{" "}
                {uncovered.map((l) => `line ${l.lineNumber} (${l.productName})`).join(", ")}. A discount on it goes to Deal
                Desk only; at 0% it needs nothing.
              </Alert>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
