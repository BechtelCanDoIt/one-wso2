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
import { Box, Link, MenuItem, Paper, Skeleton, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useDeskColumn } from "../api/useDeskApi";
import type { ColumnSpec } from "../utils/deskBoard";
import DeskCardItem from "./DeskCardItem";

const PAGE = 10;

/** A compact dropdown in a column's header. */
function Small({ label, value, options, onChange }: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly { value: string; label: string }[];
  readonly onChange: (v: string) => void;
}): JSX.Element {
  return (
    <TextField
      select
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{ select: { displayEmpty: true, renderValue: (v) => `${label}: ${options.find((o) => o.value === v)?.label ?? ""}` } }}
      inputProps={{ "aria-label": label }}
      sx={{ minWidth: 0, flex: 1, "& .MuiSelect-select": { py: 0.5, fontSize: 12.5 } }}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value} dense>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

/**
 * One board column (D130): its count, its own sort and quick filter, ten
 * cards that scroll, "Show 10 more", and "Open as list" for hundreds.
 */
export default function DeskLane({
  spec,
  filterQuery,
  onOpenList,
}: {
  readonly spec: ColumnSpec;
  /** The board's filters, as a query. */
  readonly filterQuery: string;
  readonly onOpenList: (sort: string, quick: string) => void;
}): JSX.Element {
  const [sort, setSort] = useState(spec.sorts[0].value);
  const [quick, setQuick] = useState("");
  const [shown, setShown] = useState(PAGE);
  const params = new URLSearchParams(filterQuery);
  params.set("sort", sort);
  if (quick) params.set("quick", quick);
  params.set("limit", String(shown));
  const col = useDeskColumn(spec.key, params.toString());
  const items = col.data?.items ?? [];
  const total = col.data?.total ?? 0;

  return (
    <Paper component="section" aria-label={spec.title} elevation={0} sx={{ bgcolor: "action.hover", borderRadius: 2, p: 1.25, minWidth: 0 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ px: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {spec.title}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} aria-label={`${total} quotes`}>
          {col.data ? total.toLocaleString() : ""}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 0.5, mb: 1 }}>
        {spec.desc}
      </Typography>
      <Stack direction="row" spacing={0.75} sx={{ mb: 1.25 }}>
        <Small label="Sort" value={sort} options={spec.sorts} onChange={(v) => { setSort(v); setShown(PAGE); }} />
        <Small label={spec.quickLabel} value={quick} options={spec.quick} onChange={(v) => { setQuick(v); setShown(PAGE); }} />
      </Stack>
      {col.error ? (
        <ErrorNotice error={col.error} onRetry={() => void col.refetch()} retrying={col.isFetching}>
          Couldn&apos;t load this column.
        </ErrorNotice>
      ) : col.isPending ? (
        <Stack spacing={1}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={92} />
          ))}
        </Stack>
      ) : items.length ? (
        <Stack spacing={1} sx={{ maxHeight: 640, overflowY: "auto", pr: 0.25 }}>
          {items.map((c) => (
            <DeskCardItem key={c.quoteId} card={c} column={spec.key} />
          ))}
        </Stack>
      ) : (
        <Box sx={{ border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 2, p: 2.5, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Nothing here{filterQuery || quick ? " with these filters" : ""}.
          </Typography>
        </Box>
      )}
      {total ? (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.5, pt: 1, typography: "caption", color: "text.secondary" }}>
          <span>
            Showing {items.length} of {total.toLocaleString()}
          </span>
          <Stack direction="row" spacing={1}>
            {total > shown ? (
              <Link component="button" type="button" variant="caption" sx={{ fontWeight: 600 }} onClick={() => setShown((n) => n + PAGE)}>
                Show 10 more
              </Link>
            ) : null}
            <Link component="button" type="button" variant="caption" sx={{ fontWeight: 600 }} onClick={() => onOpenList(sort, quick)}>
              Open as list
            </Link>
          </Stack>
        </Stack>
      ) : null}
    </Paper>
  );
}
