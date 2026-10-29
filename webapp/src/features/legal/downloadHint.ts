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

import { missingManualFields, type ManualCounterparty } from "@features/legal/manualCounterparty";

// "a", "a and b", "a, b and c".
function joinWithAnd(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// The manual fields a user types in, then the ones they pick, as named in the hint.
const MANUAL_FIELD_HINTS: Record<ReturnType<typeof missingManualFields>[number], { verb: "fill" | "choose"; text: string }> = {
  name: { verb: "fill", text: "legal name" },
  street: { verb: "fill", text: "street address" },
  city: { verb: "fill", text: "city" },
  countryCode: { verb: "choose", text: "the country" },
};

/**
 * What's left before the NDA can be downloaded, as one sentence, e.g. "To
 * download, fill in the legal name and city, and choose the country." Null
 * when nothing is missing. The WSO2 Company is only asked for once the
 * counterparty has a country, because until then it is filled in from it.
 */
export function downloadHint(options: {
  isManual: boolean;
  manualParty: ManualCounterparty;
  hasCustomer: boolean;
  hasCountry: boolean;
  hasWso2Company: boolean;
}): string | null {
  const fill: string[] = [];
  const choose: string[] = [];
  if (options.isManual) {
    for (const key of missingManualFields(options.manualParty)) {
      const hint = MANUAL_FIELD_HINTS[key];
      (hint.verb === "fill" ? fill : choose).push(hint.text);
    }
  } else if (!options.hasCustomer) {
    choose.push("a customer");
  }
  if (options.hasCountry && !options.hasWso2Company) choose.push("a WSO2 Company");

  const parts = [
    ...(fill.length ? [`fill in the ${joinWithAnd(fill)}`] : []),
    ...(choose.length ? [`choose ${joinWithAnd(choose)}`] : []),
  ];
  return parts.length ? `To download, ${parts.join(", and ")}.` : null;
}
