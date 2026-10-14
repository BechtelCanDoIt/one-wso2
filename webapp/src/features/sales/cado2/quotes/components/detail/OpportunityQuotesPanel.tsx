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
import { Link as RouterLink } from "react-router";
import { Box, Link, Stack, Typography } from "@wso2/oxygen-ui";
import { LayersIcon } from "@wso2/oxygen-ui-icons-react";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useOpportunityQuotes } from "@features/sales/cado2/quotes/api/useQuoteApi";
import StatusChip from "@features/sales/cado2/components/status-chip/StatusChip";
import PrimaryStar from "@features/sales/cado2/components/primary-star/PrimaryStar";
import {
  STATUS_COLOR,
  quoteStatusLabel,
} from "@features/sales/cado2/quotes/lifecycle/lifecycle";
import { cado2Paths } from "@features/sales/cado2/cado2Paths";

/**
 * The quote page's list of every quote on the same opportunity (D68), the
 * primary one starred. Every AM sees them all (D69).
 */
export default function OpportunityQuotesPanel({
  quoteId,
  opportunityId,
}: {
  quoteId: number;
  opportunityId: string;
}): JSX.Element | null {
  const quotes = useOpportunityQuotes(opportunityId);
  // A failed load says so, rather than the card vanishing (2026-10-13).
  if (quotes.error) {
    return (
      <ErrorNotice error={quotes.error} onRetry={() => void quotes.refetch()} retrying={quotes.isFetching}>
        Couldn&apos;t load this opportunity&apos;s quotes.
      </ErrorNotice>
    );
  }
  if (!quotes.data) return null;
  const hasPrimary = quotes.data.some((q) => q.isPrimary);

  return (
    <SectionCard title="This Opportunity's Quotes" icon={<LayersIcon size={18} />}>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mb: 1.5 }}
      >
        {hasPrimary
          ? "The primary quote is synced to Salesforce."
          : "No primary quote: nothing is synced to Salesforce."}
      </Typography>
      <Stack
        component="ul"
        spacing={1.25}
        sx={{ listStyle: "none", m: 0, p: 0 }}
      >
        {quotes.data.map((q) => (
          <Box component="li" key={q.quoteId}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              {q.isPrimary ? (
                <PrimaryStar />
              ) : null}
              {q.quoteId === quoteId ? (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {q.quoteNumber ?? "Draft"} (this quote)
                </Typography>
              ) : (
                <Link
                  component={RouterLink}
                  to={cado2Paths.quote(q.quoteId)}
                  variant="body2"
                  sx={{ fontWeight: 600 }}
                >
                  {q.quoteNumber ?? "Draft"}
                </Link>
              )}
              <StatusChip
                color={STATUS_COLOR[q.status]}
                label={quoteStatusLabel(q.status, q.versionNumber)}
              />
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {q.ownerEmail}
            </Typography>
          </Box>
        ))}
      </Stack>
    </SectionCard>
  );
}
