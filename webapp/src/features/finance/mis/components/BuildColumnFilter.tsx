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

import { useState } from "react";
import { Box, Button, IconButton, Popover, TextField } from "@wso2/oxygen-ui";
import { ListFilterIcon } from "@wso2/oxygen-ui-icons-react";

/**
 * A column header's text filter: an icon that opens a field, and shows on the
 * icon, to a screen reader as well, when the column is filtered.
 */
export default function BuildColumnFilter({
  label,
  text,
  onChange,
}: {
  label: string;
  text: string;
  onChange: (text: string) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const filtered = text.trim() !== "";
  return (
    <>
      <IconButton
        size="small"
        color={filtered ? "primary" : "default"}
        aria-label={filtered ? `Filter by ${label}, filtered by "${text.trim()}"` : `Filter by ${label}`}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <ListFilterIcon size={14} />
      </IconButton>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5 }}>
          <TextField
            autoFocus
            size="small"
            label={`Filter ${label}`}
            value={text}
            onChange={(event) => onChange(event.target.value)}
          />
          <Button size="small" disabled={!filtered} onClick={() => onChange("")}>
            Clear filter
          </Button>
        </Box>
      </Popover>
    </>
  );
}
