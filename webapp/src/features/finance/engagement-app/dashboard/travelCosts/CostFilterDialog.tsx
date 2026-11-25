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
import { Autocomplete, Box, Checkbox, Chip, FormControlLabel, Stack, TextField } from "@wso2/oxygen-ui";
import { useDebouncedValue } from "@hooks/useDebouncedValue";
import type { EmployeeOption } from "../../api/engagementTypes";
import { useTravelRequests } from "../../api/useEngagementApi";
import { useEngagementAccess } from "../../api/useEngagementUserInfo";
import type { TravelCosts } from "../../api/dashboardTypes";
import EaDialog from "../../components/EaDialog";
import { FilterInput } from "../../components/FilterFields";
import { usePeopleFaces } from "../../api/usePeopleFaces";
import { PersonChip } from "../../components/PersonChip";
import PersonPicker from "../../components/PersonPicker";
import { Mono } from "../../components/StatusChips";
import { fmtRange, place } from "../../model/format";
import { FILTER_LABEL, filterOptions } from "./filterOptions";
import { FILTER_KEYS, joinFilter, type CostView, type CostViewPatch, type FilterKey } from "./costView";

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
  // Names of the people picked here, for their chips until the directory has them.
  const [names, setNames] = useState<Record<string, string>>({});
  const faceOf = usePeopleFaces();
  const access = useEngagementAccess();
  const jq = useDebouncedValue(job.trim(), 250);
  const canSuggest = access.travelRequests && jq.length >= 2;
  const suggested = useTravelRequests({ segment: "all", search: jq, limit: 8 }, canSuggest);
  const set = (k: FilterKey, v: string[]) => setDraft((d) => ({ ...d, [k]: v }));
  const addJob = (raw: string) => {
    const v = raw.trim();
    if (v && !(draft.tcJob ?? []).includes(v)) set("tcJob", [...(draft.tcJob ?? []), v]);
    setJob("");
  };
  const addPerson = (p: EmployeeOption | null) => {
    if (!p) return;
    const email = p.email.toLowerCase();
    setNames((n) => ({ ...n, [email]: p.name }));
    if (!(draft.tcEmployee ?? []).includes(email)) set("tcEmployee", [...(draft.tcEmployee ?? []), email]);
  };
  const apply = () => {
    // A job number typed but not added still counts.
    const jobs = job.trim() && !(draft.tcJob ?? []).includes(job.trim()) ? [...(draft.tcJob ?? []), job.trim()] : (draft.tcJob ?? []);
    const patch: Record<string, string | undefined> = {};
    for (const k of FILTER_KEYS) {
      const values = k === "tcJob" ? jobs : (draft[k] ?? []);
      patch[k] = values.length ? joinFilter(values) : undefined;
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
          {/* Remounted after each pick so the search box clears for the next person. */}
          <PersonPicker key={(draft.tcEmployee ?? []).length} label="Employee" value={null} onChange={addPerson} />
          <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.75 }}>
            {(draft.tcEmployee ?? []).map((e) => (
              <PersonChip key={e} email={e} name={names[e]} face={faceOf(e)} onDelete={() => set("tcEmployee", (draft.tcEmployee ?? []).filter((x) => x !== e))} />
            ))}
          </Stack>
        </Box>
        <Box>
          <Autocomplete
            freeSolo
            size="small"
            options={canSuggest ? (suggested.data?.items ?? []).filter((t) => !(draft.tcJob ?? []).includes(t.jobNumber)) : []}
            filterOptions={(x) => x}
            value={null}
            inputValue={job}
            onInputChange={(_, v, reason) => (reason === "input" || reason === "clear" ? setJob(v) : undefined)}
            onChange={(_, v) => (v ? addJob(typeof v === "string" ? v : v.jobNumber) : undefined)}
            getOptionLabel={(o) => (typeof o === "string" ? o : o.jobNumber)}
            loading={canSuggest && suggested.isFetching}
            renderOption={(props, t) => (
              <li {...props} key={t.jobNumber}>
                <Box>
                  <Mono>{t.jobNumber}</Mono>
                  <Box sx={{ fontSize: 12, color: "text.secondary" }}>
                    {t.traveller.name}, {place(t.country)}, {fmtRange(t.start, t.end)}
                  </Box>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Travel Job Number"
                placeholder={access.travelRequests ? "Type part of a job number, then pick one or press Enter" : "Type a job number and press Enter"}
                slotProps={{ inputLabel: { ...params.InputLabelProps, shrink: true } }}
              />
            )}
          />
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
