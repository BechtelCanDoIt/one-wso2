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

import { useId, useRef, useState } from "react";
import { Box, Button, IconButton, Stack, Typography } from "@wso2/oxygen-ui";
import { PaperclipIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import type { AttachmentsDraft } from "../types";
import { ATTACHMENT_ACCEPT, ATTACHMENT_RULES, attachmentProblem, formatSize } from "./attachmentRules";

/**
 * Files on a request: those it already holds, which can be taken off, and those
 * about to be uploaded. A file that cannot be attached is refused as it is chosen,
 * with the reason, and the rest of the choice is kept.
 */
export default function AttachmentsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AttachmentsDraft;
  onChange: (next: AttachmentsDraft) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [problems, setProblems] = useState<string[]>([]);

  const add = (chosen: FileList | null) => {
    if (!chosen) return;
    let next = value;
    const refused: string[] = [];
    for (const file of Array.from(chosen)) {
      const problem = attachmentProblem(file, next);
      if (problem) refused.push(problem);
      else next = { ...next, files: [...next.files, file] };
    }
    setProblems([...new Set(refused)]);
    onChange(next);
    if (input.current) input.current.value = "";
  };

  const rows = [
    ...value.saved.map((a) => ({
      key: `saved-${a.id}`,
      name: a.name,
      size: a.sizeBytes,
      remove: () => onChange({ ...value, saved: value.saved.filter((s) => s.id !== a.id), removed: [...value.removed, a.id] }),
    })),
    ...value.files.map((file, index) => ({
      key: `new-${index}-${file.name}`,
      name: file.name,
      size: file.size,
      remove: () => onChange({ ...value, files: value.files.filter((_, i) => i !== index) }),
    })),
  ];

  return (
    <Stack spacing={1} role="group" aria-labelledby={`${id}-label`}>
      <Typography id={`${id}-label`} variant="body2" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      {rows.length > 0 && (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
          {rows.map((row) => (
            <Box
              component="li"
              key={row.key}
              sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.75, "& + &": { borderTop: 1, borderColor: "divider" } }}
            >
              <PaperclipIcon size={16} aria-hidden />
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                {row.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatSize(row.size)}
              </Typography>
              <IconButton size="small" aria-label={`Remove ${row.name}`} onClick={row.remove}>
                <XIcon size={14} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
      <Box>
        <input
          ref={input}
          id={id}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          hidden
          aria-label={label}
          onChange={(e) => add(e.target.files)}
        />
        <Button size="small" variant="outlined" startIcon={<PaperclipIcon size={16} />} onClick={() => input.current?.click()}>
          Add files
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {ATTACHMENT_RULES}
      </Typography>
      {problems.map((problem) => (
        <Typography key={problem} role="alert" variant="caption" color="error">
          {problem}
        </Typography>
      ))}
    </Stack>
  );
}
