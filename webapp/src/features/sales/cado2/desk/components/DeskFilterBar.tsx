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
import { Badge, Box, Button, Collapse, Link, Paper, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import { SlidersHorizontalIcon } from "@wso2/oxygen-ui-icons-react";
import { Choice, Group, SearchBox, Segmented } from "@features/sales/cado2/insights/components/ReportFilterBar";
import { REGIONS } from "@features/sales/cado2/insights/components/RegionSwitch";
import { appliedFilters, DEAL_TYPES, moreCount, NO_FILTERS, SIZES, SUBMITTED, type DeskFilters } from "../utils/deskBoard";

/**
 * The board's filters (D130), as the Quote Report's: one search, Region,
 * Deal type and Value on top; "More filters" for the rest; one plain line of
 * what's applied. They narrow every column.
 */
export default function DeskFilterBar({
  filters: f,
  onChange,
}: {
  readonly filters: DeskFilters;
  readonly onChange: (patch: Partial<DeskFilters>) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const more = moreCount(f);
  const applied = appliedFilters(f);
  const regions = [{ value: "", label: "All regions" }, ...REGIONS.map((r) => ({ value: r as string, label: r as string }))];
  const text = (key: keyof DeskFilters, label: string, placeholder: string) => (
    <TextField
      size="small"
      label={label}
      placeholder={placeholder}
      value={f[key]}
      onChange={(e) => onChange({ [key]: e.target.value })}
      slotProps={{ inputLabel: { shrink: true } }}
      fullWidth
    />
  );

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" useFlexGap spacing={1.25} sx={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <SearchBox value={f.q} onCommit={(q) => onChange({ q })} placeholder="Quote, customer, opportunity, AM, partner or product" />
        <Choice label="Region" value={f.region} options={regions} onChange={(region) => onChange({ region })} width={140} />
        <Choice label="Deal type" value={f.dealType} options={DEAL_TYPES} onChange={(dealType) => onChange({ dealType })} width={160} />
        <Choice label="Value (USD)" value={f.size} options={SIZES} onChange={(size) => onChange({ size })} width={170} />
        {f.size === "custom" ? (
          <>
            <TextField size="small" type="number" label="From $" value={f.minValue} onChange={(e) => onChange({ minValue: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0 } }} sx={{ width: 120 }} />
            <TextField size="small" type="number" label="To $" value={f.maxValue} onChange={(e) => onChange({ maxValue: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0 } }} sx={{ width: 120 }} />
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
      </Stack>

      <Collapse in={open} unmountOnExit>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }} aria-label="More filters" component="section">
          <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)" } }}>
            <Group title="People and products">
              {text("am", "Account Manager", "Name or email")}
              {text("productUnit", "Product unit", "e.g. APIM")}
            </Group>
            <Group title="Deal">
              <Segmented
                label="Channel"
                value={f.channel}
                options={[{ value: "", label: "All" }, { value: "DIRECT", label: "Direct" }, { value: "PARTNER", label: "Partner" }]}
                onChange={(channel) => onChange({ channel })}
              />
              <Segmented
                label="Primary quote"
                value={f.primaryOnly}
                options={[{ value: "", label: "Any" }, { value: "true", label: "Primary only" }]}
                onChange={(primaryOnly) => onChange({ primaryOnly })}
              />
            </Group>
            <Group title="When and in what">
              <Choice label="Submitted" value={f.submitted} options={SUBMITTED} onChange={(submitted) => onChange({ submitted })} width="100%" />
              {text("currency", "Currency", "e.g. EUR")}
            </Group>
          </Box>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 2.5, pt: 1.75, borderTop: 1, borderColor: "divider" }}>
            <Link component="button" type="button" color="text.secondary" onClick={() => onChange({ am: "", productUnit: "", channel: "", submitted: "", primaryOnly: "", currency: "" })}>
              Reset these filters
            </Link>
            <Button variant="outlined" onClick={() => setOpen(false)}>
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
          <Link component="button" type="button" color="text.secondary" onClick={() => onChange(NO_FILTERS)} sx={{ ml: 0.5, verticalAlign: "baseline" }}>
            Clear all
          </Link>
        </Typography>
      ) : null}
    </Stack>
  );
}
