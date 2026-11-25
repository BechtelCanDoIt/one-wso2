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

import { Box, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import type { NewContact } from "../types";

/**
 * The details of a Contact Approve all will create, for the AM to check: the person Echo
 * heard on a call is not a Contact in Salesforce yet. Nothing is created until they
 * approve, and the form says so. Last name and email are what Salesforce needs.
 */
export default function NewContactForm({
  contact,
  accountName,
  problem,
  readOnly = false,
  onChange,
}: {
  contact: NewContact;
  accountName: string;
  /** Why it can't be created yet, from newContactProblem; null when it can. */
  problem: string | null;
  readOnly?: boolean;
  onChange: (contact: NewContact) => void;
}) {
  const text = (value: string | null) => value ?? "";
  const set = (patch: Partial<NewContact>) => onChange({ ...contact, ...patch });
  return (
    <Box
      role="group"
      aria-label="New contact"
      sx={{
        mt: 1,
        p: 1.5,
        border: 1,
        borderColor: "warning.main",
        borderRadius: "10px",
        bgcolor: (theme) => `color-mix(in srgb, ${(theme.vars ?? theme).palette.warning.main} 6%, transparent)`,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        A new contact in Salesforce
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.25, mb: 1.25 }}>
        Approve all creates this contact on {accountName} and gives them the role. Check the details first:
        nothing is created until you approve.
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
        <TextField
          size="small"
          label="First name"
          value={text(contact.firstName)}
          onChange={(event) => set({ firstName: event.target.value || null })}
          disabled={readOnly}
        />
        <TextField
          size="small"
          label="Last name"
          required
          value={contact.lastName}
          onChange={(event) => set({ lastName: event.target.value })}
          disabled={readOnly}
        />
        <TextField
          size="small"
          label="Email"
          required
          type="email"
          value={contact.email}
          onChange={(event) => set({ email: event.target.value })}
          disabled={readOnly}
        />
        <TextField
          size="small"
          label="Title"
          value={text(contact.title)}
          onChange={(event) => set({ title: event.target.value || null })}
          disabled={readOnly}
        />
      </Box>
      {problem && (
        <Typography variant="caption" sx={{ display: "block", mt: 1, color: "warning.dark", fontWeight: 600 }}>
          Before approving, {problem}.
        </Typography>
      )}
      <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }}>
        <Typography variant="caption" color="text.secondary">
          Already a contact under another spelling? Pick them from the list instead.
        </Typography>
      </Stack>
    </Box>
  );
}
