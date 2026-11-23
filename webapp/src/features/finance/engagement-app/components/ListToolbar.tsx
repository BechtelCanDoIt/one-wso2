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

import { useEffect, useRef, useState, type JSX, type ReactNode } from "react";
import {
  Autocomplete,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  OutlinedInput,
  Stack,
} from "@wso2/oxygen-ui";
import { FilterIcon, SearchIcon } from "@wso2/oxygen-ui-icons-react";
import { dialogPaperSx } from "@components/confirmation-dialog/dialogPaperSx";
import type { ListView } from "../model/useListView";
import { EA_SCOPE_SX } from "./eaStyles";
import { FilterDate, FilterInput, FilterSelect } from "./FilterFields";
import { fmtDate } from "../model/format";

/** A filter the dialog offers. Options are [value, label] pairs. */
export interface FilterDef {
  readonly key: string;
  readonly label: string;
  readonly type: "select" | "multi" | "date";
  readonly options?: readonly (readonly [string, string])[];
}

/** Search, the Filters button and a chip per applied filter, with room on the right for bulk actions — Me → My Team's filter bar, for the Engagement App lists. */
export default function ListToolbar({
  search,
  placeholder,
  onSearch,
  filters,
  applied,
  onApply,
  onRemove,
  right,
}: {
  readonly search?: string;
  readonly placeholder?: string;
  readonly onSearch?: (q: string) => void;
  readonly filters?: readonly FilterDef[];
  readonly applied?: ListView;
  readonly onApply?: (next: ListView) => void;
  readonly onRemove?: (key: string) => void;
  /** Bulk actions for a selection, on the right. */
  readonly right?: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const active = (filters ?? []).filter((f) => applied?.[f.key]);
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        {onSearch ? <SearchBox value={search ?? ""} placeholder={placeholder ?? "Search"} onCommit={onSearch} /> : null}
        {filters && filters.length ? (
          <Badge color="primary" badgeContent={active.length} invisible={!active.length}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterIcon size={15} />}
              onClick={() => setOpen(true)}
              sx={{ fontWeight: 600, height: 36 }}
            >
              Filters
            </Button>
          </Badge>
        ) : null}
        <Box sx={{ flex: 1 }} />
        {right ? <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", "& .MuiButton-root": { height: 36 } }}>{right}</Stack> : null}
      </Stack>
      {active.length ? (
        <Stack direction="row" spacing={0.75} sx={{ mt: 1.25, flexWrap: "wrap", rowGap: 0.75 }}>
          {active.map((f) => (
            <Chip
              key={f.key}
              size="small"
              label={`${f.label}: ${describe(f, applied?.[f.key] ?? "")}`}
              onDelete={onRemove ? () => onRemove(f.key) : undefined}
            />
          ))}
        </Stack>
      ) : null}
      {open && filters ? (
        <FilterDialog
          filters={filters}
          applied={applied ?? {}}
          onClose={() => setOpen(false)}
          onApply={(next) => {
            setOpen(false);
            onApply?.(next);
          }}
        />
      ) : null}
    </Box>
  );
}

function describe(f: FilterDef, value: string): string {
  if (f.type === "date") return fmtDate(value);
  const labels = value.split(",").map((v) => f.options?.find((o) => o[0] === v)?.[1] ?? v);
  return labels.length > 2 ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}` : labels.join(", ");
}

/** The search box: what is typed is applied after a short pause. */
function SearchBox({ value, placeholder, onCommit }: { value: string; placeholder: string; onCommit: (q: string) => void }) {
  const [text, setText] = useState(value);
  // The address can change under the box (another tab, a cleared filter): follow it.
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setText(value);
  }
  const commit = useRef(onCommit);
  useEffect(() => {
    commit.current = onCommit;
  });
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => commit.current(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text, value]);
  return (
    <OutlinedInput
      size="small"
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder={placeholder}
      inputProps={{ "aria-label": placeholder }}
      startAdornment={
        <InputAdornment position="start">
          <SearchIcon size={15} />
        </InputAdornment>
      }
      sx={{ width: { xs: "100%", sm: 300 }, height: 36, fontSize: 13 }}
    />
  );
}

function FilterDialog({
  filters,
  applied,
  onApply,
  onClose,
}: {
  filters: readonly FilterDef[];
  applied: ListView;
  onApply: (next: ListView) => void;
  onClose: () => void;
}): JSX.Element {
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const f of filters) if (applied[f.key]) out[f.key] = applied[f.key];
    return out;
  });
  const set = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  // Multi-selects take a row each; the others pair up, and one left without a partner takes the row too.
  const fullRow = new Set<string>();
  let run: FilterDef[] = [];
  for (const f of [...filters, null]) {
    if (f && f.type !== "multi") {
      run.push(f);
      continue;
    }
    if (run.length % 2) fullRow.add(run[run.length - 1].key);
    run = [];
  }
  return (
    <Dialog open fullWidth maxWidth="sm" onClose={onClose} sx={EA_SCOPE_SX} slotProps={{ paper: { sx: dialogPaperSx } }}>
      <DialogTitle>Filters</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, pt: 1 }}>
          {filters.map((f) =>
            f.type === "date" ? (
              <Box key={f.key} sx={{ gridColumn: fullRow.has(f.key) ? "1 / -1" : undefined }}>
                <FilterDate label={f.label} value={draft[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
              </Box>
            ) : f.type === "multi" ? (
              <Autocomplete
                key={f.key}
                multiple
                size="small"
                options={f.options ?? []}
                getOptionLabel={(o) => o[1]}
                isOptionEqualToValue={(a, b) => a[0] === b[0]}
                value={(f.options ?? []).filter((o) => (draft[f.key] ?? "").split(",").includes(o[0]))}
                onChange={(_, v) => set(f.key, v.map((o) => o[0]).join(","))}
                renderInput={(params) => <FilterInput params={params} label={f.label} />}
                sx={{ gridColumn: "1 / -1" }}
              />
            ) : (
              <Box key={f.key} sx={{ gridColumn: fullRow.has(f.key) ? "1 / -1" : undefined }}>
                <FilterSelect label={f.label} value={draft[f.key] ?? ""} options={f.options ?? []} onChange={(v) => set(f.key, v)} />
              </Box>
            ),
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button size="small" onClick={() => setDraft({})}>
          Clear All
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={onClose}>
          Cancel
        </Button>
        <Button size="small" variant="contained" onClick={() => onApply(draft)}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
