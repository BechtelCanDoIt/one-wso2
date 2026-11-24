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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import type { ImportLine, Product } from "@features/sales/cado2/quotes/api/quoteTypes";
import { plainDecimal, type LineValue } from "./draftForm";
import { lineFromProduct } from "./supportPlans";

/** The year an imported line goes into: Year 1 (D178); no dates before the start date. */
export interface ImportYear {
  readonly number: number;
  readonly start: string;
  readonly end: string;
}

/**
 * What a Salesforce line brings to the Add product dialog or the quote
 * (D178): its product, quantity, discount (the AM's entered discount, split
 * into volume and discretionary on save, D169) and sales price.
 */
export interface LinePrefill {
  readonly product: Product;
  readonly quantity: string;
  readonly discount: string;
  /** "" = the list price. */
  readonly salesPrice: string;
  /** A one-off line's dates within the year; "" on a recurring line. */
  readonly startDate: string;
  readonly endDate: string;
}

/**
 * A line's prefill, or null when its product isn't in the quote's price
 * book. A formula sets its own price, so Salesforce's is dropped (D81); a
 * sales price equal to the list price is the list price. A one-off line
 * keeps Salesforce's service dates when they fall inside the year, else
 * takes the year's (D146); a recurring line covers the whole year.
 */
export function importPrefill(l: ImportLine, year: ImportYear, formula: boolean): LinePrefill | null {
  const product = l.product;
  const list = product?.pricebookEntries[0]?.unitPrice ?? null;
  if (!product || list === null) return null;
  const sp = l.salesPrice === null ? "" : plainDecimal(l.salesPrice);
  const salesPrice = formula || !sp || Number(sp) === Number(list) ? "" : sp;
  const s = l.serviceStartDate ?? "";
  const e = l.serviceEndDate ?? "";
  const inYear = Boolean(year.start && s && e && s >= year.start && e <= year.end && s <= e);
  const oneOff = !product.recurring && year.start;
  return {
    product,
    quantity: l.quantity === null ? "" : plainDecimal(l.quantity),
    discount: l.discount === null ? "0" : plainDecimal(l.discount),
    salesPrice,
    startDate: oneOff ? (inYear ? s : year.start) : "",
    endDate: oneOff ? (inYear ? e : year.end) : "",
  };
}

/**
 * A ready line as the quote's line (D178), as the Add product dialog would
 * save it. unitOfMeasure is the product's (D158), or its formula's (D83).
 */
export function importedLine(p: LinePrefill, year: ImportYear, unitOfMeasure: string): LineValue | null {
  const base = lineFromProduct(p.product, year, unitOfMeasure);
  if (!base) return null;
  return {
    ...base,
    quantity: String(Number(p.quantity)),
    discount: p.discount || "0",
    salesPrice: p.salesPrice,
    startDate: p.startDate,
    endDate: p.endDate,
  };
}
