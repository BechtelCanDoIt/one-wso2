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
import { Alert, Autocomplete, Box, Button, Stack, TextField } from "@wso2/oxygen-ui";
import { PlusIcon } from "@wso2/oxygen-ui-icons-react";
import { describeError } from "@api/errors";
import { useDirectorySearch } from "../api/useProcurement";
import type { Person, ProcurementMe } from "../types";
import { FieldLabel, SmallClearIcon, StepTitle, TextInput } from "./formFields";
import { isSamePerson, MAX_ADDITIONAL_APPROVERS, MIN_DIRECTORY_QUERY, type RequestDraft } from "./requestFormModel";

const personLabel = (p: Person): string => `${p.name} (${p.email})`;

// Step 1. Who is raising the request. The backend decides the team lead from the
// requester's manager. Other people who may approve are an exception, so they are
// asked for only when the requester wants them, or when they are needed.
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
  const approversId = useId();
  const [asked, setAsked] = useState(false);
  const [open, setOpen] = useState(false);
  // What the directory is asked about: only what was typed, never the label of a picked person.
  const [query, setQuery] = useState("");
  // Only leads can approve, so only leads are offered.
  const search = useDirectorySearch(query, true);
  const selected = draft.additionalApprovers;
  const full = selected.length >= MAX_ADDITIONAL_APPROVERS;
  // With no manager on record, the first additional approver becomes the team lead.
  const needsApprover = !me.teamLead && !me.approvalExempt;
  // Shown on request, when one is needed, and while there are any: a rejected request being edited keeps its approvers in view.
  const showApprovers = asked || needsApprover || selected.length > 0;
  const options = [...(search.data ?? []), ...selected].filter(
    (p, index, all) => all.findIndex((other) => other.email === p.email) === index,
  );
  const notAllowed = (p: Person): boolean => isSamePerson(p, me) || (me.teamLead !== null && isSamePerson(p, me.teamLead));

  return (
    <Stack spacing={3.5} sx={{ py: 1 }}>
      <StepTitle>Requester details</StepTitle>
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
        <TextInput label="Date" value={today} disabled />
        <TextInput label="Your full name" value={me.name} disabled />
        <TextInput label="WSO2 email" value={me.email} disabled />
      </Box>
      <TextInput
        disabled
        label="Team lead (for approval)"
        value={me.teamLead ? personLabel(me.teamLead) : me.approvalExempt ? "Your requests need no approval" : ""}
        placeholder="No team lead found"
      />
      {showApprovers ? (
        <Box>
          <FieldLabel htmlFor={approversId} required={needsApprover}>
            Additional approvers
          </FieldLabel>
          <Autocomplete
            id={approversId}
            // The list opens only once there is something to search for, so clicking the empty box shows nothing.
            open={open && query.trim().length >= MIN_DIRECTORY_QUERY}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            multiple
            filterSelectedOptions
            forcePopupIcon={false}
            size="small"
            clearIcon={<SmallClearIcon />}
            options={options}
            value={selected}
            onChange={(_, next) => {
              onChange({ additionalApprovers: next });
              if (next.length === 0 && !needsApprover) setAsked(false);
            }}
            onInputChange={(_, next, reason) => setQuery(reason === "input" ? next : "")}
            getOptionLabel={personLabel}
            isOptionEqualToValue={(a, b) => a.email === b.email}
            getOptionDisabled={(p) => notAllowed(p) || (full && !selected.some((s) => s.email === p.email))}
            filterOptions={(all) => all}
            loading={search.isFetching}
            noOptionsText={full ? `You can add up to ${MAX_ADDITIONAL_APPROVERS}` : "No matching employee"}
            renderInput={(params) => (
              <TextField
                {...params}
                // Focus the field only when the requester asked for it, not when it is simply there.
                autoFocus={asked && selected.length === 0}
                placeholder={selected.length ? "" : "Search by email"}
              />
            )}
          />
        </Box>
      ) : (
        <Button size="small" startIcon={<PlusIcon size={16} />} onClick={() => setAsked(true)} sx={{ alignSelf: "flex-start" }}>
          Add an additional approver
        </Button>
      )}
      {search.isError && <Alert severity="error">{describeError(search.error)}</Alert>}
    </Stack>
  );
}
