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

import { describe, expect, it } from "vitest";
import { formatCustomerAddress } from "./api/useCustomerSearch";
import { COUNTRY_OPTIONS, countryName } from "./countries";
import { ndaFileNamePart } from "./fileName";
import {
  EMPTY_MANUAL_COUNTERPARTY,
  isManualCounterpartyComplete,
  manualCounterpartyAddress,
  missingManualFields,
} from "./manualCounterparty";
import { NDA_ENTITY_CONFIGS, entityForCountry } from "./pages/NdaPdfDocument";

describe("COUNTRY_OPTIONS", () => {
  it("lists every ISO 3166-1 country once, by English name", () => {
    const codes = COUNTRY_OPTIONS.map((c) => c.code);
    expect(codes).toHaveLength(249);
    expect(new Set(codes).size).toBe(codes.length);
    const names = COUNTRY_OPTIONS.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("names countries in English", () => {
    expect(countryName("LK")).toBe("Sri Lanka");
    expect(countryName("GB")).toBe("United Kingdom");
  });

  it("offers a country for every WSO2 entity, so each entity can be reached by hand", () => {
    for (const [key, cfg] of Object.entries(NDA_ENTITY_CONFIGS)) {
      const reachable = COUNTRY_OPTIONS.some((c) => entityForCountry(c.code) === key);
      expect(reachable, `${key} (${cfg.countries.join(", ")})`).toBe(true);
    }
  });
});

describe("manual counterparty", () => {
  const complete = {
    ...EMPTY_MANUAL_COUNTERPARTY,
    name: "Acme Supplies (Pvt) Ltd",
    street: "12 Main Street",
    city: "Colombo",
    countryCode: "LK",
  };

  it("needs a name, street, city and country; state and postal code are optional", () => {
    expect(missingManualFields(EMPTY_MANUAL_COUNTERPARTY)).toEqual(["name", "street", "city", "countryCode"]);
    expect(isManualCounterpartyComplete(complete)).toBe(true);
    expect(isManualCounterpartyComplete({ ...complete, name: "   " })).toBe(false);
  });

  it("formats its address like a Salesforce billing address, with the country's English name", () => {
    expect(formatCustomerAddress(manualCounterpartyAddress(complete))).toBe("12 Main Street, Colombo, Sri Lanka");
    expect(
      formatCustomerAddress(manualCounterpartyAddress({ ...complete, state: " WP ", postalCode: "00400" })),
    ).toBe("12 Main Street, Colombo, WP 00400, Sri Lanka");
  });

  it("maps its country code to the right WSO2 entity", () => {
    expect(entityForCountry(complete.countryCode)).toBe("WSO2 Lanka (Pvt) Ltd — LK");
    expect(entityForCountry("FR")).toBe("");
  });
});

describe("ndaFileNamePart", () => {
  it("keeps a plain name readable", () => {
    expect(ndaFileNamePart("Acme Supplies Ltd")).toBe("Acme-Supplies-Ltd");
  });

  it("drops characters file systems refuse and falls back when nothing is left", () => {
    expect(ndaFileNamePart('A/B: "Corp" <Ltd>?')).toBe("AB-Corp-Ltd");
    expect(ndaFileNamePart("///")).toBe("party");
    expect(ndaFileNamePart("x".repeat(200))).toHaveLength(80);
  });
});

describe("entityForCountry", () => {
  it("maps a billing country to its WSO2 entity, by name or ISO code, ignoring case", () => {
    expect(entityForCountry("Sri Lanka")).toBe("WSO2 Lanka (Pvt) Ltd — LK");
    expect(entityForCountry("united states")).toBe("WSO2 LLC — US");
    expect(entityForCountry(" GB ")).toBe("WSO2 (UK) Ltd — UK");
  });

  it("returns empty when no entity serves the country, so the user must choose", () => {
    expect(entityForCountry("France")).toBe("");
    expect(entityForCountry(null)).toBe("");
    expect(entityForCountry("")).toBe("");
  });

  it("never claims one country for two entities", () => {
    const all = Object.values(NDA_ENTITY_CONFIGS).flatMap((cfg) => cfg.countries.map((c) => c.toLowerCase()));
    expect(new Set(all).size).toBe(all.length);
  });

  it("gives every entity at least one country", () => {
    for (const [key, cfg] of Object.entries(NDA_ENTITY_CONFIGS)) {
      expect(cfg.countries.length, key).toBeGreaterThan(0);
      expect(entityForCountry(cfg.countries[0]), key).toBe(key);
    }
  });
});

describe("formatCustomerAddress", () => {
  const empty = { billingStreet: null, billingCity: null, billingState: null, billingPostalCode: null, billingCountry: null };

  it("returns empty for a missing or all-null address", () => {
    expect(formatCustomerAddress(null)).toBe("");
    expect(formatCustomerAddress(empty)).toBe("");
  });

  it("joins the parts, with state and postcode sharing one part", () => {
    expect(
      formatCustomerAddress({
        billingStreet: "1 Main St",
        billingCity: "Austin",
        billingState: "TX",
        billingPostalCode: "78759",
        billingCountry: "United States",
      }),
    ).toBe("1 Main St, Austin, TX 78759, United States");
  });

  it("keeps a lone state or postcode without stray separators", () => {
    expect(formatCustomerAddress({ ...empty, billingCity: "Colombo", billingState: "WP" })).toBe("Colombo, WP");
    expect(formatCustomerAddress({ ...empty, billingCity: "Colombo", billingPostalCode: "00400" })).toBe("Colombo, 00400");
  });
});
