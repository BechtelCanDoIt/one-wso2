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
import { alpha, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@wso2/oxygen-ui";
import { CircleAlertIcon, PencilIcon } from "@wso2/oxygen-ui-icons-react";
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
   * The term, short, e.g. "1Y 1D" (D85, D94), shown on every recurring line;
   * a one-off line says "One-time". "" while there is no term yet.
   */
  readonly duration: string;
  /**
   * The wizard: lines without a category yet (D72) come first, under a plain
   * "Uncategorised" heading with no subtotal (D93). The category is chosen
   * in the line's dialog.
   */
  readonly groupUncategorised?: boolean;
}

/**
 * The products as an order form (misc/WSO2_Order_Form_Sample.docx): grouped
 * into Subscription, Support and Professional Services, each with its own
 * subtotal, then the total order value. Each amount is the line's cost over
 * the whole term, which the Duration column shows (D85, back since D94). On a partner-led
 * quote, the partner's commission and the
 * net order value follow:
 *
 *   Total order value              88,700.00
 *   Partner commission (15%)     − 13,305.00
 *   Net order value                75,395.00
 */
export default function OrderFormTable({
  lines,
  currency,
  actions,
  below,
  commissionPercent = null,
  groupUncategorised = false,
  duration,
}: OrderFormTableProps): JSX.Element {
  const form = orderForm(lines, commissionPercent);
  // Product, unit of measure, unit list, qty, discount, duration, amount (+ actions).
  const dataCols = 7;
  const cols = actions ? dataCols + 1 : dataCols;
  // Products brought in from Salesforce whose category isn't chosen yet (D72).
  const pending = groupUncategorised ? lines.filter((l) => !l.category) : [];
  const cur = currency ? ` (${currency})` : "";
  const money = (v: string | null) => (v ? formatMoney(v) : "—");

  const totalRow = (label: string, value: string | null, strong = false, prefix = "") => (
    <TableRow sx={strong ? { bgcolor: "action.hover" } : undefined}>
      <TableCell colSpan={dataCols - 1} align="right" sx={{ fontWeight: strong ? 800 : 600, borderBottom: strong ? 0 : undefined }}>
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


  // The uncategorised group's heading (D93, D95): in the error colour, saying
  // what to do, so it reads as something to fix, not just another section.
  const uncategorisedHeader = (
    <TableRow>
      <TableCell colSpan={cols} sx={{ bgcolor: (t) => alpha(t.palette.error.main, 0.06), py: 0.75 }}>
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 1, color: "error.main" }}>
          <CircleAlertIcon size={16} aria-hidden />
          <Typography variant="overline" sx={{ fontWeight: 700, lineHeight: 1.6 }}>
            Uncategorised
          </Typography>
          <Typography variant="body2" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
            · Click <PencilIcon size={14} aria-label="Edit" /> to choose a category
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );

  const lineRow = (l: SheetLine) => {
    const index = lines.indexOf(l);
    return (
      <Fragment key={l.number}>
        <TableRow>
          <TableCell sx={{ minWidth: 200 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {l.productName}
            </Typography>
            {/* The name and the SKU only (2026-10-12, amends D53): the description is shown when choosing the product. */}
            {l.productCode ? (
              <Typography variant="caption" color="text.secondary" display="block">
                {l.productCode}
              </Typography>
            ) : null}
            {/* How a formula line's unit price was worked out (D81); it has no discount. */}
            {l.formula ? (
              <Typography variant="caption" color="text.secondary" display="block" aria-label="Priced by formula">
                Formula {l.formula.version}:{" "}
                <Box component="span" sx={{ fontFamily: "monospace" }}>
                  {l.formula.explanation}
                </Box>
              </Typography>
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
          <TableCell sx={{ whiteSpace: "nowrap" }}>{l.recurring ? duration || "–" : "One-time"}</TableCell>
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
            <TableCell align="right">Discount</TableCell>
            <TableCell>Duration</TableCell>
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
        {/* Lines waiting for a category come first, under a plain heading, with no
            subtotal, framed by a thin red line until each has one (D72, D93). */}
        {pending.length > 0 ? (
          <TableBody
            aria-label="Uncategorised"
            sx={(t) => {
              const line = `1px solid ${t.palette.error.main}`;
              return {
                "& td:first-of-type": { borderLeft: line },
                "& td:last-of-type": { borderRight: line },
                // An inset shadow, not a border: the header row's bottom border
                // sits on the same line and would win the collapsed-border tie.
                "& tr:first-of-type td": { boxShadow: `inset 0 1px 0 ${t.palette.error.main}` },
                "& tr:last-of-type td": { borderBottom: line },
              };
            }}
          >
            {uncategorisedHeader}
            {pending.map(lineRow)}
          </TableBody>
        ) : null}
        <TableBody>
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
