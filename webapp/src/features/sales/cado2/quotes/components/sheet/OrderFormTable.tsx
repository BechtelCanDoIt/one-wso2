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

import { Fragment, type JSX, type ReactNode } from "react";
import { alpha, Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@wso2/oxygen-ui";
import { TriangleAlertIcon } from "@wso2/oxygen-ui-icons-react";
import { orderForm, type SheetLine } from "@features/sales/cado2/quotes/sheet/sheetModel";
import { formatMoney } from "@features/sales/cado2/utils/money";

const num = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;

interface OrderFormTableProps {
  readonly lines: readonly SheetLine[];
  readonly currency: string;
  /** Buttons for a line (the wizard's edit / remove), by its position in `lines`. */
  readonly actions?: (index: number) => ReactNode;
  /** A row under a line, e.g. its problems, by its position in `lines`. */
  readonly below?: (index: number) => ReactNode;
  /** A partner-led quote's commission %, e.g. "15": adds the commission and net rows. */
  readonly commissionPercent?: string | null;
  /**
   * The wizard's note on a line without a category yet (D72), by position in
   * `lines`, shown under the product. Such lines are listed first.
   */
  readonly categoryNote?: (index: number) => ReactNode;
}

/**
 * The products as an order form (misc/WSO2_Order_Form_Sample.docx): grouped
 * into Subscription, Support and Professional Services, each with its own
 * subtotal, then the total order value. Each amount is the line's cost over
 * the whole term. On a partner-led quote, the partner's commission and the
 * net order value follow:
 *
 *   Total order value              88,700.00
 *   Partner commission (15%)     − 13,305.00
 *   Net order value                75,395.00
 */
export default function OrderFormTable({ lines, currency, actions, below, commissionPercent = null, categoryNote }: OrderFormTableProps): JSX.Element {
  const form = orderForm(lines, commissionPercent);
  const cols = actions ? 7 : 6;
  // Products brought in from Salesforce whose category isn't chosen yet (D72).
  const pending = categoryNote ? lines.filter((l) => !l.category) : [];
  const cur = currency ? ` (${currency})` : "";
  const money = (v: string | null) => (v ? formatMoney(v) : "—");

  const totalRow = (label: string, value: string | null, strong = false, prefix = "") => (
    <TableRow sx={strong ? { bgcolor: "action.hover" } : undefined}>
      <TableCell colSpan={5} align="right" sx={{ fontWeight: strong ? 800 : 600, borderBottom: strong ? 0 : undefined }}>
        {label}
        {cur}
      </TableCell>
      <TableCell align="right" sx={{ ...num, fontWeight: strong ? 800 : 600, fontSize: strong ? "1rem" : undefined, borderBottom: strong ? 0 : undefined }}>
        {value ? `${prefix}${money(value)}` : money(value)}
      </TableCell>
      {actions ? <TableCell sx={{ borderBottom: strong ? 0 : undefined }} /> : null}
    </TableRow>
  );

  const groupHeader = (title: string) => (
    <TableRow>
      <TableCell colSpan={cols} sx={{ bgcolor: "action.hover", py: 0.75 }}>
        <Typography variant="overline" sx={{ fontWeight: 700, lineHeight: 1.6 }}>
          {title}
        </Typography>
      </TableCell>
    </TableRow>
  );

  // Lines waiting for a category stand apart from the category sections: an
  // amber strip that says what to do, and an amber bar down each line (2026-10-12).
  const pendingHeader = (
    <TableRow>
      <TableCell
        colSpan={cols}
        sx={{
          bgcolor: (t) => alpha(t.palette.warning.main, 0.14),
          boxShadow: (t) => `inset 4px 0 ${t.palette.warning.main}`,
          py: 0.75,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "warning.dark" }}>
          <TriangleAlertIcon size={16} aria-hidden />
          <Typography variant="overline" sx={{ fontWeight: 700, lineHeight: 1.6 }}>
            Not categorised
          </Typography>
          <Typography variant="body2" sx={{ color: "text.primary" }}>
            · Choose a category for {pending.length === 1 ? "1 product" : `${pending.length} products`}
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );

  const lineRow = (l: SheetLine) => {
    const index = lines.indexOf(l);
    const waiting = pending.includes(l);
    return (
      <Fragment key={l.number}>
        <TableRow>
          <TableCell
            sx={{
              minWidth: 200,
              ...(waiting ? { boxShadow: (t) => `inset 4px 0 ${t.palette.warning.main}` } : {}),
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {l.productName}
            </Typography>
            {/* The name and the SKU only (2026-10-12, amends D53): the description is shown when choosing the product. */}
            {l.productCode ? (
              <Typography variant="caption" color="text.secondary" display="block">
                {l.productCode}
              </Typography>
            ) : null}
            {!l.category ? categoryNote?.(index) : null}
            {l.categoryByRep && l.category ? (
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                label="Category chosen by AM"
                title="This product has no category set up by an Admin, so the AM chose it. Deal Desk checks it."
                sx={{ mt: 0.5 }}
              />
            ) : null}
          </TableCell>
          <TableCell>{l.unitOfMeasure ?? "–"}</TableCell>
          <TableCell align="right" sx={num}>
            {formatMoney(l.unitPrice)}
          </TableCell>
          <TableCell align="right" sx={num}>
            {l.quantity}
          </TableCell>
          <TableCell align="right" sx={num}>
            {Number(l.discountPercent) ? `${l.discountPercent}%` : "–"}
          </TableCell>
          <TableCell align="right" sx={{ ...num, fontWeight: 600 }}>
            {money(l.tcv)}
          </TableCell>
          {actions ? (
            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
              {actions(index)}
            </TableCell>
          ) : null}
        </TableRow>
        {below?.(index)}
      </Fragment>
    );
  };

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
      <Table size="small" aria-label="Products">
        <TableHead>
          <TableRow>
            <TableCell>Product or service</TableCell>
            <TableCell>Unit of measure</TableCell>
            <TableCell align="right">Unit list</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell align="right">Disc.</TableCell>
            <TableCell align="right">Amount{cur}</TableCell>
            {actions ? (
              <TableCell align="right">
                <Box component="span" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
                  Actions
                </Box>
              </TableCell>
            ) : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Lines waiting for a category come first, under their own heading, with no subtotal (D72). */}
          {pending.length > 0 ? (
            <>
              {pendingHeader}
              {pending.map(lineRow)}
            </>
          ) : null}
          {form.groups.map((g) => (
            <Fragment key={g.category}>
              {groupHeader(g.title)}
              {g.lines.map(lineRow)}
              {totalRow(`${g.title} subtotal`, g.subtotal)}
            </Fragment>
          ))}
          {form.commission !== null ? (
            <>
              {totalRow("Total order value", form.total)}
              {totalRow(`Partner commission (${commissionPercent}%)`, form.commission, false, "− ")}
              {totalRow("Net order value", form.netOrderValue, true)}
            </>
          ) : (
            totalRow("Total order value", form.total, true)
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
