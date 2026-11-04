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
import { Chip, Tooltip } from "@wso2/oxygen-ui";
import type { QuoteView } from "@features/sales/cado2/quotes/api/quoteTypes";

/**
 * "As Deal Desk" in a quote's header (D127): the caller changes someone
 * else's quote as Deal Desk, not as its owner. A label only: what they may
 * do is the owner's, and their history entries say "(as Deal Desk)".
 */
export default function ActingAsChip({ quote }: { quote: Pick<QuoteView, "actingAs" | "ownerEmail"> }): JSX.Element | null {
  if (quote.actingAs !== "DEAL_DESK") return null;
  return (
    <Tooltip title={`${quote.ownerEmail}'s quote. What you change here is recorded as Deal Desk.`}>
      <Chip size="small" variant="outlined" color="info" label="As Deal Desk" />
    </Tooltip>
  );
}
