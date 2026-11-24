
import { useState, type JSX } from "react";
import { Autocomplete, Box, Button, Checkbox, Chip, FormControlLabel, Stack, TextField } from "@wso2/oxygen-ui";
import type { EmployeeOption } from "../../api/engagementTypes";
import type { TravelCosts } from "../../api/dashboardTypes";
import EaDialog from "../../components/EaDialog";
import { FilterInput } from "../../components/FilterFields";
import PersonPicker from "../../components/PersonPicker";
import { FILTER_LABEL, filterOptions } from "./filterOptions";
import { FILTER_KEYS, type CostView, type CostViewPatch, type FilterKey } from "./costView";

type Draft = Partial<Record<FilterKey, string[]>>;

const MULTI: readonly FilterKey[] = ["tcSource", "tcCountry", "tcAgent", "tcPaid", "tcCustomer", "tcCostType"];

/** Source, Employee, Job Number, Destination Country, Travel Agent, Engagement, Customer and Cost Type: every filter the cost widgets share. */
export default function CostFilterDialog({
  view,
  facets,
  onApply,
  onClose,
}: {
  view: CostView;
  facets: TravelCosts["facets"] | undefined;
  onApply: (patch: CostViewPatch) => void;
  onClose: () => void;
}): JSX.Element {
  const [draft, setDraft] = useState<Draft>(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, [...(view.filters[k] ?? [])]])));
  const [job, setJob] = useState("");
  const set = (k: FilterKey, v: string[]) => setDraft((d) => ({ ...d, [k]: v }));
  const addJob = () => {
    const v = job.trim();
    if (v && !(draft.tcJob ?? []).includes(v)) set("tcJob", [...(draft.tcJob ?? []), v]);
    setJob("");
  };
  const apply = () => {
    // A job number typed but not added still counts.
    const jobs = job.trim() && !(draft.tcJob ?? []).includes(job.trim()) ? [...(draft.tcJob ?? []), job.trim()] : (draft.tcJob ?? []);
    const patch: Record<string, string | undefined> = {};
    for (const k of FILTER_KEYS) {
      const values = k === "tcJob" ? jobs : (draft[k] ?? []);
      patch[k] = values.length ? values.join(",") : undefined;
    }
    onApply(patch);
  };
  return (
    <EaDialog title="Filters" subtitle="These apply to every Travel Costs widget." confirmLabel="Apply" onConfirm={apply} onClose={onClose} maxWidth="sm">
      <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
        {MULTI.map((k) => {
          const options = filterOptions(k, facets);
          return (
            <Autocomplete
              key={k}
              multiple
              size="small"
              options={options}
              getOptionLabel={(o) => o[1]}
              isOptionEqualToValue={(a, b) => a[0] === b[0]}
              value={(draft[k] ?? []).map((v) => options.find((o) => o[0] === v) ?? ([v, v] as const))}
              onChange={(_, v) => set(k, v.map((o) => o[0]))}
              renderInput={(params) => <FilterInput params={params} label={FILTER_LABEL[k]} />}
            />
          );
        })}
        <Box>
          <PersonPicker
            label="Employee"
            value={null}
            onChange={(p: EmployeeOption | null) => p && !(draft.tcEmployee ?? []).includes(p.email.toLowerCase()) && set("tcEmployee", [...(draft.tcEmployee ?? []), p.email.toLowerCase()])}
          />
          <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.75 }}>
            {(draft.tcEmployee ?? []).map((e) => (
              <Chip key={e} size="small" label={e} onDelete={() => set("tcEmployee", (draft.tcEmployee ?? []).filter((x) => x !== e))} />
            ))}
          </Stack>
        </Box>
        <Box>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              label="Travel Job Number"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addJob();
                }
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              placeholder="Type a job number and press Add"
            />
            <Button size="small" variant="outlined" onClick={addJob} disabled={!job.trim()}>
              Add
            </Button>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.75 }}>
            {(draft.tcJob ?? []).map((j) => (
              <Chip key={j} size="small" label={j} onDelete={() => set("tcJob", (draft.tcJob ?? []).filter((x) => x !== j))} />
            ))}
          </Stack>
        </Box>
        <FormControlLabel
          control={<Checkbox size="small" checked={Boolean(draft.tcUnlinked?.length)} onChange={(e) => set("tcUnlinked", e.target.checked ? ["1"] : [])} />}
          label="Only lines without a job number"
        />
      </Box>
    </EaDialog>
  );
}
