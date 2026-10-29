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

import type { JSX } from "react";
import { Alert, Box, Checkbox, FormControlLabel, Skeleton, Stack, Typography } from "@wso2/oxygen-ui";
import { FileStackIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import { messageOf } from "@features/sales/cado2/quotes/api/errors";
import {
  pagesLabel,
  toggled,
  useQuoteSupportingDocuments,
  useSetQuoteSupportingDocuments,
  useSupportingDocumentLibrary,
} from "@features/sales/cado2/quotes/api/useSupportingDocuments";

/**
 * The Legal step's last card (DGD-10): the Admin's supporting documents, any
 * of which the AM adds after the order form. Nothing is ticked on a new
 * quote. A tick is saved at once: it belongs to the quote, not the draft, and
 * can still change on the quote page until the order form is issued.
 * Hidden while the library is empty; a failed load shows an error with a retry.
 */
export default function SupportingDocumentsCard({ quoteId }: { quoteId: number | null }): JSX.Element | null {
  const library = useSupportingDocumentLibrary();
  const quote = useQuoteSupportingDocuments(quoteId);
  const set = useSetQuoteSupportingDocuments(quoteId);

  const docs = library.data ?? [];
  const ticked = quote.data?.documents.map((d) => d.id) ?? [];
  // A failed load says so; only a library that loaded empty hides the card.
  const failed = library.error ?? (quoteId !== null ? quote.error : null);
  if (!failed && (library.isPending || (docs.length === 0 && ticked.length === 0))) return null;

  return (
    <SectionCard title="Supporting Documents" icon={<FileStackIcon size={18} />}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Added at the end of the order form PDF.
      </Typography>
      {failed ? (
        <ErrorNotice
          error={failed}
          onRetry={() => void (library.error ? library.refetch() : quote.refetch())}
          retrying={library.isFetching || quote.isFetching}
        >
          Couldn&apos;t load the supporting documents.
        </ErrorNotice>
      ) : quoteId !== null && quote.isPending ? (
        <Skeleton variant="rounded" height={96} />
      ) : (
        <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
          {docs.map((d) => (
            <FormControlLabel
              key={d.id}
              sx={{ alignItems: "flex-start", m: 0, py: 0.75 }}
              control={
                <Checkbox
                  size="small"
                  sx={{ pt: 0.25 }}
                  checked={ticked.includes(d.id)}
                  // Each tick replaces the whole selection, so only once it has loaded.
                  disabled={set.isPending || quote.data?.canChange !== true}
                  onChange={(_, on) => set.mutate(toggled(ticked, d.id, on))}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {d.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {pagesLabel(d.pageCount)}
                  </Typography>
                </Box>
              }
            />
          ))}
        </Stack>
      )}
      {quote.data?.retired.length ? (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          {quote.data.retired.join(", ")} {quote.data.retired.length === 1 ? "was" : "were"} retired by an Admin, so{" "}
          {quote.data.retired.length === 1 ? "it's" : "they're"} no longer added.
        </Typography>
      ) : null}
      {quoteId === null ? (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          Save the draft to choose them.
        </Typography>
      ) : null}
      {set.error ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {messageOf(set.error) ?? "Couldn't save the supporting documents."}
        </Alert>
      ) : null}
    </SectionCard>
  );
}

/** Review's one line: what follows the order form, if anything. */
export function SupportingDocumentsSummary({ quoteId }: { quoteId: number | null }): JSX.Element | null {
  const quote = useQuoteSupportingDocuments(quoteId);
  const docs = quote.data?.documents ?? [];
  if (docs.length === 0) return null;
  return (
    <Typography variant="body2" color="text.secondary">
      <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
        Supporting documents:
      </Box>{" "}
      {docs.map((d) => d.title).join(", ")}, added after the order form.
    </Typography>
  );
}
