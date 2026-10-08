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

/**
 * One outlined chip per product in the "Products in Use" column.
 *
 * The text, the border and a light wash are the product's own colour, so a
 * row of products reads as a legend rather than as six copies of the same
 * chip. A name this map does not know takes the slate, still outlined.
 */
const PRODUCT_CHIP_COLOURS = {
  "API Platform": chip("#1d4ed8", "29, 78, 216"),
  IAM: chip("#6d28d9", "109, 40, 217"),
  Integration: chip("#0f766e", "15, 118, 110"),
  Choreo: chip("#b34c00", "179, 76, 0"),
  "Agent Platform": chip("#b45309", "180, 83, 9"),
  Moesif: chip("#0e7490", "14, 116, 144"),
} as const;

const SLATE = chip("#475569", "71, 85, 105");

function chip(text: string, rgb: string) {
  return {
    text,
    border: `rgba(${rgb}, 0.45)`,
    wash: `rgba(${rgb}, 0.1)`,
  };
}

export function productChipSx(product: string) {
  const colour = PRODUCT_CHIP_COLOURS[product as keyof typeof PRODUCT_CHIP_COLOURS] ?? SLATE;
  return {
    height: 21,
    fontWeight: 600,
    color: colour.text,
    borderColor: colour.border,
    backgroundColor: colour.wash,
    "& .MuiChip-label": { fontSize: 11, px: 0.75 },
  };
}
