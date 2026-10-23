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
import { Alert, Typography } from "@wso2/oxygen-ui";
import { formatDate } from "@features/sales/cado2/quotes/form/draftForm";
import type { MoneyMeta } from "../api/insightsTypes";

/**
 * How the money was added up (D104): "USD at Salesforce rates of 19 Oct
 * 2026", and which quotes couldn't be converted. Never silent.
 */
export default function MoneyNote({ meta }: { meta: MoneyMeta }): JSX.Element {
  if (!meta.ratesAvailable) {
    return (
      <Alert severity="warning" variant="outlined">
        Salesforce&apos;s exchange rates couldn&apos;t be read, so amounts aren&apos;t added up. Counts and times are
        still correct.
      </Alert>
    );
  }
  const left = meta.unconverted.map((u) => `${u.quotes} in ${u.currency}`).join(", ");
  return (
    <Typography variant="caption" color="text.secondary" component="p">
      Amounts in {meta.currency} at Salesforce&apos;s exchange rates
      {meta.ratesAsOf ? ` of ${formatDate(meta.ratesAsOf.slice(0, 10))}` : ""}.
      {left ? ` Not included in totals (no rate): ${left}.` : ""}
    </Typography>
  );
}
