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

import { useMemo, useState, type JSX } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@wso2/oxygen-ui";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useOpportunityImport, usePricingFormulas } from "@features/sales/cado2/quotes/api/useQuoteApi";
import type { ImportLine } from "@features/sales/cado2/quotes/api/quoteTypes";
import { importPrefill, type ImportYear, type LinePrefill } from "@features/sales/cado2/quotes/form/opportunityImport";
import { formatMoney } from "@features/sales/cado2/utils/money";

interface ImportOpportunityDialogProps {
  readonly open: boolean;
  /** The quote's renewal opportunity, whose own products are imported. */
  readonly opportunityId: string;
  /** The quote's currency and price book: each product is priced from them. */
  readonly currency: string;
  readonly pricebookId: string;
  /** Year 1, where every imported line goes (D178). */
  readonly year: ImportYear;
  /** Salesforce lines already added after changing them, shown as added. */
  readonly changed: ReadonlySet<string>;
  /**
   * The products already in the year, by product Id and price-book entry Id:
   * such a line can't be imported again (D178, 2026-11-24).
   */
  readonly onQuote: ReadonlySet<string>;
  /** Adds the ticked lines as they are. */
  readonly onAdd: (lines: readonly LinePrefill[]) => void;
  /** Opens the Add product dialog filled in from this line, to change it first. */
  readonly onChange: (line: LinePrefill, salesforceLineId: string) => void;
  readonly onClose: () => void;
}

const productName = (l: ImportLine) => l.product?.name ?? l.productName ?? "No product";
const productCode = (l: ImportLine) => l.product?.productCode ?? l.productCode;

function Figures({ line }: { line: ImportLine }): JSX.Element {
  return (
    <>
      <TableCell align="right">{line.quantity ?? "–"}</TableCell>
      <TableCell align="right">{line.salesPrice === null ? "–" : formatMoney(line.salesPrice)}</TableCell>
      <TableCell align="right">{line.discount === null ? "0%" : `${line.discount}%`}</TableCell>
      <TableCell align="right">{line.totalPrice === null ? "–" : formatMoney(line.totalPrice)}</TableCell>
    </>
  );
}

function Name({ line }: { line: ImportLine }): JSX.Element {
  const code = productCode(line);
  return (
    <TableCell>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {productName(line)}
      </Typography>
      {code ? (
        <Typography variant="caption" color="text.secondary">
          {code}
        </Typography>
      ) : null}
    </TableCell>
  );
}

function GroupRow({ label }: { label: string }): JSX.Element {
  return (
    <TableRow>
      <TableCell colSpan={7} sx={{ bgcolor: "action.hover", py: 0.75 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
      </TableCell>
    </TableRow>
  );
}

/** The dialog's body, mounted while it is open, so each opening reads Salesforce afresh with every ready line ticked. */
function ImportBody(props: Omit<ImportOpportunityDialogProps, "open" | "onClose"> & { onClose: () => void }): JSX.Element {
  const { opportunityId, currency, pricebookId, year, changed, onQuote, onAdd, onChange, onClose } = props;
  const query = useOpportunityImport(opportunityId, currency, pricebookId, true);
  const formulas = usePricingFormulas();
  const lines = useMemo(() => query.data?.lines ?? [], [query.data]);
  const isFormula = (l: ImportLine) =>
    Boolean(l.product && formulas.data?.some((f) => f.productId === l.product!.id && f.status === "ACTIVE"));
  const prefill = (l: ImportLine) => importPrefill(l, year, isFormula(l));

  // A product already in the year can't be imported again; a line just added
  // after changing it stays where it was, saying so.
  const already = (l: ImportLine) =>
    !changed.has(l.id) &&
    Boolean(l.product && (onQuote.has(l.product.id) || l.product.pricebookEntries.some((e) => onQuote.has(e.id))));
  const reasonOf = (l: ImportLine) => (already(l) ? "Already on this quote" : l.reason);
  // Every line not ready (or missing its product) is to change, or can't be added.
  const ready = lines.filter((l) => l.status === "READY" && l.product && !already(l));
  const toChange = lines.filter((l) => l.status === "CHANGE" && l.product && !already(l));
  const cannot = lines.filter((l) => !ready.includes(l) && !toChange.includes(l));
  // One line per product (D178, option A): a product listed twice in
  // Salesforce has its first line ticked; the other can be ticked once the
  // first is unticked. picked holds the AM's choice per product (null: none).
  const productOf = (l: ImportLine) => l.product?.id ?? l.id;
  const [picked, setPicked] = useState<ReadonlyMap<string, string | null>>(new Map());
  const firstOf = (pid: string) => ready.find((l) => productOf(l) === pid)?.id ?? null;
  const pickOf = (pid: string): string | null => {
    const p = picked.get(pid);
    return p === undefined ? firstOf(pid) : p;
  };
  const products = [...new Set(ready.map(productOf))];
  const ticked = ready.filter((l) => pickOf(productOf(l)) === l.id);
  // Another line of the same product is ticked.
  const taken = (l: ImportLine) => {
    const p = ready.some((r) => productOf(r) === productOf(l)) ? pickOf(productOf(l)) : null;
    return p !== null && p !== l.id;
  };
  const toggle = (l: ImportLine) => setPicked((m) => new Map(m).set(productOf(l), pickOf(productOf(l)) === l.id ? null : l.id));
  const all = products.length > 0 && ticked.length === products.length;
  const selectAll = () => setPicked(new Map(products.map((p) => [p, all ? null : (pickOf(p) ?? firstOf(p))])));

  const add = () => {
    onAdd(ticked.flatMap((l) => prefill(l) ?? []));
    onClose();
  };

  let body: JSX.Element;
  if (query.error) {
    body = (
      <ErrorNotice error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching}>
        Couldn&apos;t read the opportunity&apos;s products from Salesforce.
      </ErrorNotice>
    );
  } else if (query.isPending) {
    body = (
      <Typography variant="body2" color="text.secondary">
        Reading the opportunity in Salesforce…
      </Typography>
    );
  } else if (lines.length === 0) {
    body = (
      <Paper variant="outlined" sx={{ p: 2, textAlign: "center", borderStyle: "dashed" }}>
        <Typography variant="body2" color="text.secondary">
          This opportunity has no products in Salesforce.
        </Typography>
      </Paper>
    );
  } else {
    body = (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ minWidth: 760 }} aria-label="Products on the opportunity">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={all}
                  indeterminate={ticked.length > 0 && !all}
                  disabled={ready.length === 0}
                  onChange={selectAll}
                  slotProps={{ input: { "aria-label": "Select every product that can be added as it is" } }}
                />
              </TableCell>
              <TableCell>Product</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Sales price</TableCell>
              <TableCell align="right">Discount</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {ready.map((l) => (
              <TableRow key={l.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={ticked.includes(l)}
                    disabled={taken(l)}
                    onChange={() => toggle(l)}
                    slotProps={{ input: { "aria-label": `Add ${productName(l)}` } }}
                  />
                </TableCell>
                <Name line={l} />
                <Figures line={l} />
                <TableCell align="right">
                  {taken(l) ? (
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                      Same product as a ticked line
                    </Typography>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {toChange.length > 0 ? <GroupRow label="Change before adding" /> : null}
            {toChange.map((l) => {
              const p = prefill(l);
              return (
                <TableRow key={l.id}>
                  <TableCell padding="checkbox" />
                  <Name line={l} />
                  <Figures line={l} />
                  <TableCell align="right">
                    {changed.has(l.id) ? (
                      <Typography variant="body2" color="text.secondary">
                        Added
                      </Typography>
                    ) : taken(l) ? (
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                        Same product as a ticked line
                      </Typography>
                    ) : (
                      <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="flex-end">
                        <Typography variant="body2" color="error" sx={{ whiteSpace: "nowrap" }}>
                          {l.reason}
                        </Typography>
                        <Button size="small" variant="outlined" disabled={!p} onClick={() => p && onChange(p, l.id)} sx={{ whiteSpace: "nowrap" }}>
                          Change and add
                        </Button>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {cannot.length > 0 ? <GroupRow label="Can't be added" /> : null}
            {cannot.map((l) => (
              <TableRow key={l.id} sx={{ "& td": { color: "text.secondary" } }}>
                <TableCell padding="checkbox" />
                <Name line={l} />
                <Figures line={l} />
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  {reasonOf(l)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <>
      <DialogContent>{body}</DialogContent>
      <DialogActions>
        <Box sx={{ mr: "auto", pl: 1 }}>
          {ready.length > 0 ? (
            <Typography variant="body2" color="text.secondary">
              {ticked.length} selected
            </Typography>
          ) : null}
        </Box>
        <Button onClick={onClose}>{changed.size > 0 ? "Close" : "Cancel"}</Button>
        <Button variant="contained" disabled={ticked.length === 0} onClick={add}>
          {ticked.length === 0 ? "Add products" : `Add ${ticked.length} ${ticked.length === 1 ? "product" : "products"}`}
        </Button>
      </DialogActions>
    </>
  );
}

/**
 * "Import from opportunity" on a renewal (D178): the renewal opportunity's
 * own products in Salesforce, each sorted by the checks adding it by hand
 * applies. Ready ones are ticked and added as they are, with Salesforce's
 * quantity, sales price and discount, into Year 1; one that needs a change
 * opens Add product filled in; one that can't be quoted says why.
 */
export default function ImportOpportunityDialog(props: ImportOpportunityDialogProps): JSX.Element {
  const { open, onClose } = props;
  return (
    // A click outside doesn't throw the selection away; Cancel, X or Escape close it.
    <Dialog open={open} onClose={(_, reason) => reason !== "backdropClick" && onClose()} maxWidth="lg" fullWidth>
      <DialogTitle>
        Import from opportunity
        <Typography variant="body2" color="text.secondary" component="span" sx={{ display: "block" }}>
          The products on this opportunity in Salesforce, added to Year {props.year.number} as they are.
        </Typography>
      </DialogTitle>
      {open ? <ImportBody {...props} /> : null}
    </Dialog>
  );
}
