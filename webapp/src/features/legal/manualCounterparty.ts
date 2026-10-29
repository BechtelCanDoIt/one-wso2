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

// An NDA party entered by hand: a vendor, contractor, prospect or anyone else
// who isn't a Salesforce customer. It ends up in the NDA exactly as a
// Salesforce customer does, as a name and a one-line address, so the PDF and
// the entity mapping need no second code path.

import type { CustomerAddress } from "@features/legal/api/useCustomerSearch";
import { countryName } from "@features/legal/countries";

export interface ManualCounterparty {
  /** The party's registered legal name, as it should appear in the NDA. */
  name: string;
  street: string;
  city: string;
  /** Optional: not every country uses one. */
  state: string;
  /** Optional: not every country uses one. */
  postalCode: string;
  /** ISO 3166-1 alpha-2 code, or "" when not chosen yet. */
  countryCode: string;
}

export const EMPTY_MANUAL_COUNTERPARTY: ManualCounterparty = {
  name: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "",
};

/** Longest value accepted per field: long enough for real names and addresses, short enough to keep the PDF readable. */
export const MANUAL_FIELD_MAX_LENGTH: Record<keyof Omit<ManualCounterparty, "countryCode">, number> = {
  name: 200,
  street: 200,
  city: 100,
  state: 100,
  postalCode: 20,
};

/** Required fields that are still empty, in form order. */
export function missingManualFields(party: ManualCounterparty): ("name" | "street" | "city" | "countryCode")[] {
  const missing: ("name" | "street" | "city" | "countryCode")[] = [];
  if (!party.name.trim()) missing.push("name");
  if (!party.street.trim()) missing.push("street");
  if (!party.city.trim()) missing.push("city");
  if (!party.countryCode) missing.push("countryCode");
  return missing;
}

/** True when every required field is filled in. */
export function isManualCounterpartyComplete(party: ManualCounterparty): boolean {
  return missingManualFields(party).length === 0;
}

/**
 * The party's address in the same shape as a Salesforce billing address, so
 * formatCustomerAddress turns both into the NDA's one-line address the same
 * way. Blank optional parts become null and are left out.
 */
export function manualCounterpartyAddress(party: ManualCounterparty): CustomerAddress {
  const orNull = (s: string) => s.trim() || null;
  return {
    billingStreet: orNull(party.street),
    billingCity: orNull(party.city),
    billingState: orNull(party.state),
    billingPostalCode: orNull(party.postalCode),
    billingCountry: party.countryCode ? countryName(party.countryCode) : null,
  };
}
