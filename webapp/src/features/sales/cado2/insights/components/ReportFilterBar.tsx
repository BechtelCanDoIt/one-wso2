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

import { useEffect, useState, type JSX, type ReactNode } from "react";
import {
  Badge,
  Box,
  Button,
  Collapse,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@wso2/oxygen-ui";
import { SearchIcon, SlidersHorizontalIcon } from "@wso2/oxygen-ui-icons-react";
import { roleLabel } from "@features/sales/cado2/approvals/model/approvalText";
import type { ReportFilters } from "../api/insightsTypes";
import {
  appliedFilters,
  DATE_FIELDS,
  DEAL_KINDS,
  DEFAULT_FILTERS,
  moreFilterCount,
  PERIODS,
  REPORT_STATUSES,
  SIZES,
} from "../utils/reportFilters";
import { REGIONS } from "./RegionSwitch";

const APPROVER_ROLES = [
  "DEAL_DESK", "LEGAL", "FIELD_ENGINEERING", "SUPPORT", "ENGINEERING",
  "REGIONAL_DIRECTOR", "AREA_GM", "CRO", "CHIEF_OF_STAFF", "CFO", "CEO",
];


/** The search box: applies once typing pauses, so each key isn't a request. */
function SearchBox({ value, onCommit }: { readonly value: string; readonly onCommit: (v: string) => void }): JSX.Element {
  const [draft, setDraft] = useState(value);
  // A change from outside (Clear all, the URL) replaces what's typed.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setDraft(value);
  }
  useEffect(() => {
    if (draft === value) return undefined;
    const t = setTimeout(() => onCommit(draft), 400);
    return () => clearTimeout(t);
  }, [draft, value, onCommit]);
  return (
    <TextField
      size="small"
      label="Search"
      placeholder="Quote, account, opportunity, partner or product"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      slotProps={{
        input: { startAdornment: <InputAdornment position="start"><SearchIcon size={16} /></InputAdornment> },
        inputLabel: { shrink: true },
      }}
      sx={{ width: { xs: "100%", md: 300 } }}
    />
  );
}

/** A labelled dropdown of fixed choices. */
function Choice<T extends string>({
  label: text,
  value,
  options,
  onChange,
  width = 160,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { value: T; label: string }[];
  readonly onChange: (v: T) => void;
  readonly width?: number | string;
}): JSX.Element {
  return (
    <TextField
      select
      size="small"
      label={text}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
      sx={{ width }}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** A short exclusive choice, e.g. All / Direct / Partner. */
function Segmented<T extends string>({
  label: text,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { value: T; label: string }[];
  readonly onChange: (v: T) => void;
}): JSX.Element {
  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {text}
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        onChange={(_, v: T | null) => {
          if (v !== null) onChange(v);
        }}
        aria-label={text}
        sx={{
          "& .MuiToggleButton-root": { px: 1.5, fontWeight: 600, textTransform: "none" },
          "& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover": {
            bgcolor: "text.primary",
            color: "background.paper",
          },
        }}
      >
        {options.map((o) => (
          <ToggleButton key={o.value} value={o.value}>
            {o.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}

function Group({ title, children, hint }: { readonly title: string; readonly children: ReactNode; readonly hint?: string }): JSX.Element {
  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "text.disabled" }}>
        {title}
      </Typography>
      {children}
      {hint ? (
        <Typography variant="caption" color="text.disabled">
          {hint}
        </Typography>
      ) : null}
    </Stack>
  );
}

/**
 * The Quote Report's filters (approved prototype, 2026-10-23): one search,
 * Status, Region and Period up top; "More filters" for the rest, grouped;
 * one line of what's applied. Every change goes to the URL.
 */
export default function ReportFilterBar({
  filters: f,
  onChange,
  actions,
}: {
  readonly filters: ReportFilters;
  readonly onChange: (patch: Partial<ReportFilters>) => void;
  readonly actions?: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const more = moreFilterCount(f);
  const applied = appliedFilters(f);
  const regions = [{ value: "", label: "All regions" }, ...REGIONS.map((r) => ({ value: r as string, label: r as string }))];
  const roles = [{ value: "", label: "Anyone" }, ...APPROVER_ROLES.map((r) => ({ value: r, label: roleLabel(r) }))];
  const keepSort = { sort: f.sort, order: f.order };

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" useFlexGap spacing={1.25} sx={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <SearchBox value={f.q} onCommit={(q) => onChange({ q })} />
        <Choice label="Status" value={f.status} options={[{ value: "", label: "Any status" }, ...REPORT_STATUSES]} onChange={(status) => onChange({ status })} width={150} />
        <Choice label="Region" value={f.region} options={regions} onChange={(region) => onChange({ region })} width={140} />
        <Choice label="Period" value={f.period} options={PERIODS} onChange={(period) => onChange({ period })} width={170} />
        {f.period === "custom" ? (
          <>
            <TextField
              size="small"
              type="date"
              label="From"
              value={f.from}
              onChange={(e) => onChange({ from: e.target.value })}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: f.to || undefined } }}
              sx={{ width: 160 }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              value={f.to}
              onChange={(e) => onChange({ to: e.target.value })}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: f.from || undefined } }}
              sx={{ width: 160 }}
            />
          </>
        ) : null}
        <Badge badgeContent={more} color="primary" invisible={more === 0}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<SlidersHorizontalIcon size={16} />}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            sx={{ height: 40, textTransform: "none", fontWeight: 600, borderColor: open ? "text.primary" : "divider" }}
          >
            More filters
          </Button>
        </Badge>
        <Box sx={{ flexGrow: 1 }} />
        {actions}
      </Stack>

      <Collapse in={open} unmountOnExit>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }} aria-label="More filters" component="section">
          <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
            <Group title="Deal">
              <Choice label="Deal type" value={f.dealKind} options={DEAL_KINDS} onChange={(dealKind) => onChange({ dealKind })} width="100%" />
              <Segmented
                label="Channel"
                value={f.channel}
                options={[{ value: "", label: "All" }, { value: "DIRECT", label: "Direct" }, { value: "PARTNER", label: "Partner" }]}
                onChange={(channel) => onChange({ channel })}
              />
            </Group>
            <Group title="Approval" hint="Only quotes in approval are waiting on someone.">
              <Choice label="Waiting on" value={f.waitingOn} options={roles} onChange={(waitingOn) => onChange({ waitingOn })} width="100%" />
            </Group>
            <Group title="Deal size">
              <Choice label="Total contract value (USD)" value={f.size} options={SIZES} onChange={(size) => onChange({ size })} width="100%" />
              {f.size === "custom" ? (
                <Stack direction="row" spacing={1}>
                  <TextField size="small" type="number" label="From $" value={f.minValue} onChange={(e) => onChange({ minValue: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0 } }} />
                  <TextField size="small" type="number" label="To $" value={f.maxValue} onChange={(e) => onChange({ maxValue: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0 } }} />
                </Stack>
              ) : null}
            </Group>
            <Group title="Dates" hint="Choose the period (or a custom range) in the top bar.">
              <Segmented label="The period applies to" value={f.dateField} options={DATE_FIELDS} onChange={(dateField) => onChange({ dateField })} />
            </Group>
          </Box>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 2.5, pt: 1.75, borderTop: 1, borderColor: "divider" }}>
            <Link
              component="button"
              type="button"
              color="text.secondary"
              onClick={() => onChange({ dealKind: "", channel: "", waitingOn: "", size: "", minValue: "", maxValue: "", dateField: DEFAULT_FILTERS.dateField })}
            >
              Reset these filters
            </Link>
            <Button variant="contained" color="inherit" onClick={() => setOpen(false)} sx={{ bgcolor: "text.primary", color: "background.paper", "&:hover": { bgcolor: "text.primary" } }}>
              Done
            </Button>
          </Stack>
        </Paper>
      </Collapse>

      {applied.length > 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
          Filtered by:{" "}
          <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
            {applied.join(" · ")}
          </Box>{" "}
          <Link component="button" type="button" color="text.secondary" onClick={() => onChange({ ...DEFAULT_FILTERS, ...keepSort })} sx={{ ml: 0.5, verticalAlign: "baseline" }}>
            Clear all
          </Link>
        </Typography>
      ) : null}
    </Stack>
  );
}
