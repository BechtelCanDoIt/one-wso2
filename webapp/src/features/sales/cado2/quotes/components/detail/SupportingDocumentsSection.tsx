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
import { Alert, Box, Button, Checkbox, FormControlLabel, Stack, Typography } from "@wso2/oxygen-ui";
import { FileTextIcon } from "@wso2/oxygen-ui-icons-react";
import { messageOf } from "@features/sales/cado2/quotes/api/errors";
import {
  toggled,
  useHasSupportingDocuments,
  useQuoteSupportingDocuments,
  useSetQuoteSupportingDocuments,
  useSupportingDocumentLibrary,
} from "@features/sales/cado2/quotes/api/useSupportingDocuments";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";

/**
 * The supporting documents in the Order Form panel (DGD-10, option B):
 *
 *   until Issue ──[Change]── ticks saved on the quote, no new approval
 *   issued      ── what the issued PDF contains, fixed
 */
export default function SupportingDocumentsSection({ quoteId }: { quoteId: number }): JSX.Element | null {
  const quote = useQuoteSupportingDocuments(quoteId);
  const library = useSupportingDocumentLibrary();
  const set = useSetQuoteSupportingDocuments(quoteId);
  const notify = useCado2Toast();
  const [editing, setEditing] = useState<number[] | null>(null);
  const visible = useHasSupportingDocuments(quoteId);

  if (!quote.data || !visible) return null;
  const q = quote.data;
  const canChange = q.canChange && (library.data?.length ?? 0) > 0;

  const save = () => {
    if (!editing) return;
    set.mutate(editing, {
      onSuccess: () => {
        setEditing(null);
        notify("Supporting documents saved");
      },
    });
  };

  return (
    <Box component="section" aria-label="Supporting documents">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Supporting documents
        </Typography>
        {canChange && !editing ? (
          <Button
            size="small"
            onClick={() => {
              set.reset();
              setEditing(q.documents.map((d) => d.id));
            }}
          >
            Change
          </Button>
        ) : null}
      </Stack>

      {editing ? (
        <>
          {(library.data ?? []).map((d) => (
            <FormControlLabel
              key={d.id}
              sx={{ display: "flex", m: 0 }}
              control={<Checkbox size="small" checked={editing.includes(d.id)} onChange={(_, on) => setEditing(toggled(editing, d.id, on))} />}
              label={<Typography variant="body2">{d.title}</Typography>}
            />
          ))}
          {set.error ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              {messageOf(set.error) ?? "Couldn't save the supporting documents."}
            </Alert>
          ) : null}
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button size="small" onClick={() => setEditing(null)} disabled={set.isPending}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={save} disabled={set.isPending}>
              {set.isPending ? "Saving…" : "Save"}
            </Button>
          </Stack>
        </>
      ) : (
        <>
          {q.documents.length ? (
            <Stack component="ul" spacing={0.5} sx={{ listStyle: "none", p: 0, m: 0, mt: 0.5 }}>
              {q.documents.map((d) => (
                <Stack component="li" key={d.id} direction="row" spacing={1} alignItems="center">
                  <FileTextIcon size={14} aria-hidden />
                  <Typography variant="body2">{d.title}</Typography>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              None. The order form goes on its own.
            </Typography>
          )}
          {q.retired.length ? (
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
              {q.retired.join(", ")} {q.retired.length === 1 ? "was" : "were"} retired by an Admin, so{" "}
              {q.retired.length === 1 ? "it's" : "they're"} no longer added.
            </Typography>
          ) : null}
          {q.issued && q.documents.length ? (
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
              Included in the PDF.
            </Typography>
          ) : null}
        </>
      )}
    </Box>
  );
}
