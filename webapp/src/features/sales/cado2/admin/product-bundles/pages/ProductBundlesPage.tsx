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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@wso2/oxygen-ui";
import { LayersIcon, PencilIcon, PlusIcon, Trash2Icon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import LifecycleDialog from "@features/sales/cado2/quotes/components/detail/LifecycleDialog";
import EmptyState from "@features/sales/cado2/components/empty-state/EmptyState";
import PageHeader from "@features/sales/cado2/components/page-header/PageHeader";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import { ProductField, ProductsField } from "@features/sales/cado2/admin/components/AdminProductFields";
import { productLabel } from "@features/sales/cado2/components/product-list/productList";
import { changedText } from "@features/sales/cado2/quotes/form/draftForm";
import { messageOf } from "@features/sales/cado2/quotes/api/errors";
import type { FormulaProduct } from "@features/sales/cado2/quotes/api/quoteTypes";
import { useBundles, useSetBundle } from "@features/sales/cado2/admin/product-bundles/api/useBundles";
import type { Bundle } from "@features/sales/cado2/admin/product-bundles/api/bundleTypes";
import { visuallyHidden } from "@features/sales/cado2/utils/visuallyHidden";

/** The most products a bundle brings besides its parent (as the backend). */
const MAX_CHILDREN = 10;
/** The largest fixed quantity a child can have (as the backend, D125). */
const MAX_FIXED_QUANTITY = 9999;

/** A child's quantity rule as the dialog edits it; a child not listed has the parent's quantity. */
type QuantityRules = Record<string, { fixed: boolean; quantity: string }>;

const validFixed = (s: string) => /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= MAX_FIXED_QUANTITY;

/** How a child's quantity is set, as the bundles table says it (D125). */
const quantityRuleText = (fixedQuantity: number | null) =>
  fixedQuantity === null ? "same quantity as the parent" : `always ${fixedQuantity}`;

const asProduct = (id: string, name: string | null, code: string | null): FormulaProduct => ({ id, name: name ?? id, code });

/**
 * Add or change a bundle: the parent, and the products that always come
 * with it, in the order they are added to a quote. The parent can't be
 * changed once saved; remove the bundle to start again.
 */
function BundleDialog({ bundle, onClose }: { bundle: Bundle | null; onClose: () => void }): JSX.Element {
  const set = useSetBundle();
  const notify = useCado2Toast();
  const [parent, setParent] = useState<FormulaProduct | null>(
    bundle ? asProduct(bundle.parentProductId, bundle.parentName, bundle.parentCode) : null,
  );
  const [children, setChildren] = useState<FormulaProduct[]>(
    bundle ? bundle.children.map((c) => asProduct(c.productId, c.name, c.code)) : [],
  );
  // Each child's quantity rule (D125); a child added later has the parent's quantity.
  const [rules, setRules] = useState<QuantityRules>(() =>
    Object.fromEntries(
      (bundle?.children ?? []).map((c) => [c.productId, { fixed: c.fixedQuantity !== null, quantity: String(c.fixedQuantity ?? 1) }]),
    ),
  );
  const ruleOf = (id: string) => rules[id] ?? { fixed: false, quantity: "1" };
  const setRule = (id: string, change: Partial<{ fixed: boolean; quantity: string }>) =>
    setRules((r) => ({ ...r, [id]: { ...ruleOf(id), ...change } }));
  const badQuantity = children.find((c) => ruleOf(c.id).fixed && !validFixed(ruleOf(c.id).quantity));
  const [tried, setTried] = useState(false);
  const problem = !parent
    ? "Choose the parent product"
    : children.length === 0
      ? "Choose at least one product that comes with it"
      : children.length > MAX_CHILDREN
        ? `A bundle brings at most ${MAX_CHILDREN} products`
        : children.some((c) => c.id === parent.id)
          ? "The parent can't be in its own bundle"
          : badQuantity
            ? `A fixed quantity is a whole number from 1 to ${MAX_FIXED_QUANTITY}`
            : "";

  const save = () => {
    setTried(true);
    if (problem || !parent) return;
    set.mutate(
      {
        parentProductId: parent.id,
        children: children.map((c) => ({ productId: c.id, fixedQuantity: ruleOf(c.id).fixed ? Number(ruleOf(c.id).quantity) : null })),
      },
      {
        onSuccess: () => {
          notify("Bundle saved");
          onClose();
        },
      },
    );
  };

  return (
    // A click outside doesn't throw the choices away; Cancel or Escape closes it.
    <Dialog open onClose={(_, reason) => reason !== "backdropClick" && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>{bundle ? "Edit bundle" : "New bundle"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {bundle && parent ? (
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Parent product
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {productLabel(parent.name, parent.code)}
              </Typography>
            </Stack>
          ) : (
            <ProductField
              label="Parent product"
              value={parent}
              onChange={setParent}
              error={tried && !parent ? "Choose the parent product" : undefined}
            />
          )}
          <ProductsField
            name="the bundle"
            value={children}
            onChange={setChildren}
            error={tried && problem && parent ? problem : undefined}
            helperText="Added with the parent, in this order, in the same year and dates. An AM can change their sales price and discount, but not their quantity, and can only remove them with the parent."
          />
          {/* D125: the quantity comes from here; the AM can't change it. */}
          {children.length > 0 ? (
            <Stack spacing={1.25} role="group" aria-label="Quantities">
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Quantity
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  &quot;Same as the parent&quot; follows the parent&apos;s quantity, also when the AM changes it. A fixed
                  quantity, such as 1 for a support plan, stays the same whatever the parent&apos;s.
                </Typography>
              </Box>
              {children.map((c) => {
                const rule = ruleOf(c.id);
                return (
                  <Stack key={c.id} direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "center" }}>
                    <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>
                      {productLabel(c.name, c.code)}
                    </Typography>
                    <TextField
                      select
                      size="small"
                      label="Quantity"
                      value={rule.fixed ? "fixed" : "parent"}
                      onChange={(e) => setRule(c.id, { fixed: e.target.value === "fixed" })}
                      sx={{ minWidth: 200 }}
                      slotProps={{ htmlInput: { "aria-label": `Quantity of ${c.name}` } }}
                    >
                      <MenuItem value="parent">Same as the parent</MenuItem>
                      <MenuItem value="fixed">Always</MenuItem>
                    </TextField>
                    {rule.fixed ? (
                      <TextField
                        size="small"
                        type="number"
                        value={rule.quantity}
                        onChange={(e) => setRule(c.id, { quantity: e.target.value })}
                        error={tried && !validFixed(rule.quantity)}
                        sx={{ width: 110 }}
                        slotProps={{ htmlInput: { min: 1, max: MAX_FIXED_QUANTITY, "aria-label": `Fixed quantity of ${c.name}` } }}
                      />
                    ) : null}
                  </Stack>
                );
              })}
            </Stack>
          ) : null}
          {set.error ? <Alert severity="error">{messageOf(set.error) ?? "Couldn't save the bundle. Try again."}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={set.isPending}>
          Save bundle
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Admin › Product Bundles: products that always
 * come with another. When an AM adds the parent to a quote, its products are
 * added with it, in the same year and dates, and leave only with it.
 */
export default function ProductBundlesPage(): JSX.Element {
  const bundles = useBundles();
  const remove = useSetBundle();
  const notify = useCado2Toast();
  const [editing, setEditing] = useState<{ bundle: Bundle | null } | null>(null);
  const [removing, setRemoving] = useState<Bundle | null>(null);

  const newButton = (
    <Button variant="contained" startIcon={<PlusIcon size={16} />} onClick={() => setEditing({ bundle: null })}>
      New bundle
    </Button>
  );

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Product Bundles" actions={newButton} />

      <SectionCard title="Bundles" icon={<LayersIcon size={16} />}>
        {bundles.error ? (
          <ErrorNotice error={bundles.error} onRetry={() => void bundles.refetch()} retrying={bundles.isFetching}>
            Couldn&apos;t load the bundles.
          </ErrorNotice>
        ) : bundles.isPending ? (
          <Skeleton variant="rounded" height={160} aria-label="Loading bundles" />
        ) : bundles.data.length === 0 ? (
          <EmptyState
            icon={<LayersIcon size={28} />}
            title="No bundles yet"
            body="A bundle adds the products that always come with a product, for example its support, when an AM adds it to a quote."
          />
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small" aria-label="Bundles">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Comes with</TableCell>
                  <TableCell>Last changed</TableCell>
                  <TableCell align="right">
                    <Box component="span" sx={visuallyHidden}>
                      Actions
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bundles.data.map((b) => (
                  <TableRow key={b.parentProductId}>
                    <TableCell sx={{ verticalAlign: "top" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {b.parentName ?? b.parentProductId}
                      </Typography>
                      {b.parentCode ? (
                        <Typography variant="caption" color="text.secondary">
                          {b.parentCode}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top" }}>
                      {b.children.map((c) => (
                        <Typography key={c.productId} variant="body2">
                          {productLabel(c.name ?? c.productId, c.code)}{" "}
                          <Typography component="span" variant="caption" color="text.secondary">
                            · {quantityRuleText(c.fixedQuantity)}
                          </Typography>
                        </Typography>
                      ))}
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" color="text.secondary">
                        {changedText(b.updatedAt, b.updatedByEmail)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" aria-label={`Edit the bundle of ${b.parentName ?? b.parentProductId}`} onClick={() => setEditing({ bundle: b })}>
                          <PencilIcon size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove">
                        <IconButton size="small" aria-label={`Remove the bundle of ${b.parentName ?? b.parentProductId}`} onClick={() => setRemoving(b)}>
                          <Trash2Icon size={16} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      {editing ? <BundleDialog bundle={editing.bundle} onClose={() => setEditing(null)} /> : null}

      {removing ? (
        <LifecycleDialog
          title={`Remove the bundle of ${removing.parentName ?? removing.parentProductId}?`}
          confirmLabel="Remove bundle"
          danger
          pending={remove.isPending}
          error={remove.error}
          onClose={() => {
            // So another bundle's dialog doesn't show this one's error.
            remove.reset();
            setRemoving(null);
          }}
          onConfirm={() =>
            remove.mutate(
              { parentProductId: removing.parentProductId, children: null },
              {
                onSuccess: () => {
                  notify("Bundle removed");
                  setRemoving(null);
                },
              },
            )
          }
        >
          New quotes will no longer add its products with it. Quotes that already have them keep them, as ordinary lines.
        </LifecycleDialog>
      ) : null}
    </Stack>
  );
}
