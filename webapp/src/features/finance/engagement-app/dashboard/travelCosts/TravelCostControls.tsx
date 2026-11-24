
import { useState, type JSX } from "react";
import { Alert, Badge, Box, Button, Card, Chip, FormControlLabel, Menu, MenuItem, Stack, Switch, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@wso2/oxygen-ui";
import { ChartColumnIcon, DownloadIcon, FilterIcon, TableIcon } from "@wso2/oxygen-ui-icons-react";
import { FilterDate, FilterSelect } from "../../components/FilterFields";
import { fmtDate } from "../../model/format";
import { InfoHint } from "../dashboardParts";
import { utcStamp } from "./costFormat";
import { COST_SOURCE_LABEL, notConvertedText, USD_RATE_HINT_WITH_TRANSACTIONS } from "../travelCostText";
import type { CostCtx } from "../widgets/types";
import CostFilterDialog from "./CostFilterDialog";
import { describeFilter, FILTER_LABEL } from "./filterOptions";
import { FILTER_KEYS, filterCount, type FilterKey } from "./costView";
import { RANGE_PRESETS, rangeFor, rangeProblem, recentYears, type RangePreset } from "./dateRanges";

/** The view toggle's buttons: icons, each with its name as tooltip and label. */
const VIEW_MODES = [
  { mode: "charts", label: "Charts", Icon: ChartColumnIcon },
  { mode: "tables", label: "Tables", Icon: TableIcon },
] as const;

/** The Travel Costs controls bar: period, comparison, view, filters, download, and what to know about the figures. */
export default function TravelCostControls({ cost, today, canDownloadTransactions }: { cost: CostCtx; today: string; canDownloadTransactions: boolean }): JSX.Element {
  const { view, set } = cost;
  const data = cost.query.data;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ key: string; from: string; to: string }>({ key: "", from: "", to: "" });
  // The custom dates being typed, until both make a valid range. A new applied range replaces them.
  const key = `${view.period.from}|${view.period.to}`;
  const typed = draft.key === key ? draft : { key, from: view.period.from, to: view.period.to };
  const problem = view.range === "custom" ? rangeProblem(typed) : "";

  const pickPreset = (v: string) => {
    const preset = v as RangePreset;
    if (preset === "custom") {
      const r = rangeFor("custom", today, { from: view.period.from, to: view.period.to });
      set({ tcRange: "custom", tcFrom: r.from, tcTo: r.to, tcYear: undefined });
    } else if (preset === "year") set({ tcRange: "year", tcYear: String(view.year ?? recentYears(today)[1]), tcFrom: undefined, tcTo: undefined });
    else set({ tcRange: preset === "ytd" ? undefined : preset, tcYear: undefined, tcFrom: undefined, tcTo: undefined });
  };
  const editDates = (next: { from: string; to: string }) => {
    setDraft({ key, ...next });
    if (!rangeProblem(next)) set({ tcRange: "custom", tcFrom: next.from, tcTo: next.to });
  };
  const download = async (what: "summary" | "transactions") => {
    setMenu(null);
    setBusy(true);
    try {
      await cost.exportCsv(what);
    } finally {
      setBusy(false);
    }
  };

  const active = FILTER_KEYS.filter((k) => view.filters[k]?.length);
  const skipped = data ? notConvertedText(data.notConverted) : "";
  return (
    <Card variant="outlined" component="section" aria-label="Travel Costs controls" sx={{ p: 2, minWidth: 0 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1.5 }}>
        <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600, mr: 0.5 }}>
          Travel Costs
        </Typography>
        <InfoHint label="How USD is calculated">{USD_RATE_HINT_WITH_TRANSACTIONS}</InfoHint>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ minWidth: 180 }}>
          <FilterSelect label="Period" anyLabel={null} value={view.range} options={RANGE_PRESETS.map((p) => [p.value, p.label] as const)} onChange={pickPreset} />
        </Box>
        {view.range === "year" ? (
          <Box sx={{ minWidth: 110 }}>
            <FilterSelect
              label="Year"
              anyLabel={null}
              value={String(view.year ?? recentYears(today)[1])}
              options={recentYears(today).map((y) => [String(y), String(y)] as const)}
              onChange={(v) => set({ tcYear: v })}
            />
          </Box>
        ) : null}
        {view.range === "custom" ? (
          <Stack direction="row" spacing={1.5}>
            <Box sx={{ minWidth: 150 }}>
              <FilterDate label="Start Date" value={typed.from} onChange={(v) => editDates({ from: v, to: typed.to })} />
            </Box>
            <Box sx={{ minWidth: 150 }}>
              <FilterDate label="End Date" value={typed.to} onChange={(v) => editDates({ from: typed.from, to: v })} />
            </Box>
          </Stack>
        ) : null}
        <FormControlLabel
          control={<Switch size="small" checked={view.compare} onChange={(e) => set({ tcCompare: e.target.checked ? undefined : "0" })} />}
          label="Compare With Last Year"
          slotProps={{ typography: { fontSize: 13 } }}
        />
        <ToggleButtonGroup exclusive size="small" value={view.mode} onChange={(_, v: "charts" | "tables" | null) => v && set({ tcView: v === "tables" ? "tables" : undefined })} aria-label="View" sx={{ "& .MuiToggleButton-root": { px: 1.25, height: 36 } }}>
          {VIEW_MODES.map(({ mode, label, Icon }) => (
            <Tooltip key={mode} title={label}>
              <ToggleButton value={mode} aria-label={label} aria-pressed={view.mode === mode}>
                <Icon size={16} aria-hidden />
              </ToggleButton>
            </Tooltip>
          ))}
        </ToggleButtonGroup>
        <Badge color="primary" badgeContent={filterCount(view)} invisible={!filterCount(view)}>
          <Button variant="outlined" size="small" startIcon={<FilterIcon size={15} />} onClick={() => setFiltersOpen(true)} sx={{ fontWeight: 600, height: 36 }}>
            Filters
          </Button>
        </Badge>
        <Button variant="outlined" size="small" startIcon={<DownloadIcon size={15} />} disabled={busy} onClick={(e) => setMenu(e.currentTarget)} aria-haspopup="menu" sx={{ fontWeight: 600, height: 36 }}>
          {busy ? "Downloading…" : "Download CSV"}
        </Button>
        <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
          <MenuItem onClick={() => void download("summary")}>Summary CSV</MenuItem>
          {canDownloadTransactions ? <MenuItem onClick={() => void download("transactions")}>Transactions CSV</MenuItem> : null}
        </Menu>
      </Stack>
      {problem ? (
        <Typography variant="caption" color="error" role="alert" sx={{ display: "block", mt: 0.75 }}>
          {problem}
        </Typography>
      ) : null}
      {active.length ? (
        <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: "wrap", rowGap: 0.75 }}>
          {active.map((k: FilterKey) => (
            <Chip key={k} size="small" label={`${FILTER_LABEL[k]}: ${describeFilter(k, view.filters[k] ?? [], data?.facets)}`} onDelete={() => set({ [k]: undefined })} />
          ))}
        </Stack>
      ) : null}
      {data ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Period {fmtDate(data.from)} to {fmtDate(data.to)}. {data.compare ? `Compared With ${fmtDate(data.compare.from)} to ${fmtDate(data.compare.to)}. ` : ""}Data As Of {utcStamp(data.dataAsOf)}.
        </Typography>
      ) : null}
      {data?.failedSources.length ? (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          Some figures are missing. {data.failedSources.map((s) => COST_SOURCE_LABEL[s]).join(" and ")} could not be read, so they are left out of every total.
        </Alert>
      ) : null}
      {data?.comparisonFailedSources.length || data?.comparisonTruncated ? (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          Last year's figures are incomplete{data.comparisonFailedSources.length ? `, ${data.comparisonFailedSources.map((s) => COST_SOURCE_LABEL[s]).join(" and ")} could not be read for that period` : ""}, so no change against last year is shown.
        </Alert>
      ) : null}
      {data?.truncated ? (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          This range has more lines than the dashboard can total. Choose a shorter period.
        </Alert>
      ) : null}
      {skipped ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {skipped}
        </Typography>
      ) : null}
      {filtersOpen ? (
        <CostFilterDialog
          view={view}
          facets={data?.facets}
          onClose={() => setFiltersOpen(false)}
          onApply={(patch) => {
            setFiltersOpen(false);
            set(patch);
          }}
        />
      ) : null}
    </Card>
  );
}
