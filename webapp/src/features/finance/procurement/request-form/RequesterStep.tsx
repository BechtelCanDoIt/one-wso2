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

import { useId, useState } from "react";
import { Alert, Autocomplete, Box, Stack, TextField } from "@wso2/oxygen-ui";
import { describeError } from "@api/errors";
import { useDirectorySearch } from "../api/useProcurement";
import type { Person, ProcurementMe } from "../types";
import { FieldLabel, SmallClearIcon, StepTitle, TextInput } from "./formFields";
import { isSamePerson, type RequestDraft } from "./requestFormModel";

const personLabel = (p: Person): string => `${p.name} (${p.email})`;

// Step 1. Who is raising the request, and who approves it first.
export default function RequesterStep({
  draft,
  me,
  today,
  onChange,
}: {
  draft: RequestDraft;
  me: ProcurementMe;
  today: string;
  onChange: (patch: Partial<RequestDraft>) => void;
}) {
  const leadId = useId();
  const [input, setInput] = useState(draft.teamLead ? personLabel(draft.teamLead) : "");
  // What the directory is asked about: only what was typed, never the label of a picked person.
  const [query, setQuery] = useState("");
  const search = useDirectorySearch(query);
  const options = [...(search.data ?? []), ...(draft.teamLead ? [draft.teamLead] : [])].filter(
    (p, index, all) => all.findIndex((other) => other.id === p.id) === index,
  );
  const self = draft.teamLead !== null && isSamePerson(draft.teamLead, me);

  return (
    <Stack spacing={3.5} sx={{ py: 1 }}>
      <StepTitle>Requester details</StepTitle>
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
        <TextInput label="Date" value={today} disabled />
        <TextInput label="Your full name" value={me.name} disabled />
        <TextInput label="WSO2 email" value={me.email} disabled />
      </Box>
      <Box>
        <FieldLabel htmlFor={leadId} required>
          Team lead (for approval)
        </FieldLabel>
        <Autocomplete
          id={leadId}
          clearIcon={<SmallClearIcon />}
          size="small"
          options={options}
          value={draft.teamLead}
          inputValue={input}
          onInputChange={(_, next, reason) => {
            setInput(next);
            setQuery(reason === "input" ? next : "");
          }}
          onChange={(_, next) => onChange({ teamLead: next })}
          getOptionLabel={personLabel}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          filterOptions={(all) => all}
          loading={search.isFetching}
          noOptionsText={query.trim().length < 2 ? "Type at least 2 characters to search" : "No matching employee"}
          renderInput={(params) => <TextField {...params} required placeholder="Search by name or email" />}
        />
      </Box>
      {search.isError && <Alert severity="error">{describeError(search.error)}</Alert>}
      {self && <Alert severity="warning">You cannot be the team lead on your own request.</Alert>}
    </Stack>
  );
}
