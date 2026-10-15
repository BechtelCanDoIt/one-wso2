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

import { useState, type FormEvent, type JSX } from "react";
import { Box, Button, IconButton, InputAdornment, TextField } from "@wso2/oxygen-ui";
import { SearchIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import { LIBRARY_MAX_QUERY_LENGTH } from "../smartSearchPaths";

interface SearchBoxProps {
  /** What the box starts with. The parent re-keys the box when the address changes, so it follows back and forward. */
  readonly initialValue?: string;
  readonly autoFocus?: boolean;
  /** Called with the trimmed question; never with an empty one. */
  readonly onSubmit: (query: string) => void;
  /** Called after the × empties the box, for a page that should also leave the question behind. */
  readonly onClear?: () => void;
}

/**
 * The question box. A form, so Enter and the button do the same thing and it is announced as a search.
 */
export default function SearchBox({
  initialValue = "",
  autoFocus = false,
  onSubmit,
  onClear,
}: SearchBoxProps): JSX.Element {
  const [draft, setDraft] = useState(initialValue);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = draft.trim();
    if (question) onSubmit(question);
  };

  const clear = () => {
    setDraft("");
    onClear?.();
  };

  return (
    <Box component="form" role="search" aria-label="Search the Library" onSubmit={submit}>
      <TextField
        fullWidth
        autoFocus={autoFocus}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Try: How do we answer a security questionnaire?"
        autoComplete="off"
        slotProps={{
          htmlInput: { "aria-label": "Ask a question", maxLength: LIBRARY_MAX_QUERY_LENGTH },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon size={18} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {draft !== "" && (
                  <IconButton size="small" onClick={clear} aria-label="Clear search" sx={{ mr: 0.5 }}>
                    <XIcon size={16} />
                  </IconButton>
                )}
                <Button type="submit" variant="contained" size="small" disabled={draft.trim() === ""}>
                  Search
                </Button>
              </InputAdornment>
            ),
            sx: { borderRadius: 8, pl: 2, pr: 0.75 },
          },
        }}
      />
    </Box>
  );
}
