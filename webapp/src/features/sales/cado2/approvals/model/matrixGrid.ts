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

// The discount approval matrix laid out like Sales' sheet (D176): a row per
// discount group, a column per approver, in the sheet's order.
//
//   API Management  PS + APIM   5%  N/A … All  7%  10%  12%  N/A  Above 12%  N/A
//                               AM          DD  RD  AGM  CRO  CoS  CFO        CEO
//
// A ladder limit shows as "7%", the last rung as "Above 12%", a required
// reviewer and Deal Desk (who reviews every quote) as "All", anything else as
// "N/A". Given the saved matrix as `base`, cells that differ carry the old text.

import type { ApprovalGroup, ApprovalMapping, ApprovalMatrix, ApprovalPreview } from "@features/sales/cado2/approvals/api/approvalTypes";

/** The columns, in the order of Sales' sheet (it also has Customer Success, not a QuickQuote role). */
export const MATRIX_COLUMNS = [
  "ACCOUNT_MANAGER",
  "LEGAL",
  "FIELD_ENGINEERING",
  "SUPPORT",
  "ENGINEERING",
  "DEAL_DESK",
  "REGIONAL_DIRECTOR",
  "AREA_GM",
  "CRO",
  "CHIEF_OF_STAFF",
  "CFO",
  "CEO",
] as const;

export type MatrixRole = (typeof MATRIX_COLUMNS)[number];

export type CellKind = "limit" | "above" | "all" | "na";

export interface MatrixCell {
  readonly role: MatrixRole;
  readonly text: string;
  readonly kind: CellKind;
  /** The saved text, when an unsaved change differs from it. */
  readonly was?: string;
}

export interface MatrixRow {
  readonly code: string;
  readonly name: string;
  /** What puts products in the group: "PS + APIM", "PR (any unit)", "SKU C-OC-M*", "3 products". */
  readonly products: readonly string[];
  /** The saved products, when an unsaved change differs from them. */
  readonly productsWas?: readonly string[];
  readonly cells: readonly MatrixCell[];
  /** Not in the saved matrix yet. */
  readonly isNew: boolean;
}

/** A limit as the sheet writes it: "5%", "7.5%"; text being typed shows as typed. */
export function percent(v: string): string {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) ? `${n}%` : `${v}%`;
}

/** One mapping as a short label for the Products column. */
export function mappingShort(m: ApprovalMapping): string {
  if (m.kind === "PRODUCTS") return m.products.length === 1 ? m.products[0].name || m.products[0].id : `${m.products.length} products`;
  if (m.kind === "SKU") return `SKU ${m.skuPattern}`;
  const c = m.classification.trim();
  const u = m.productUnit.trim();
  if (c && u) return `${c} + ${u}`;
  return c ? `${c} (any unit)` : `${u} (any classification)`;
}

export function groupProducts(mappings: readonly ApprovalMapping[], code: string): string[] {
  return mappings.filter((m) => m.groupCode === code).map(mappingShort);
}

export function groupCells(g: ApprovalGroup): MatrixCell[] {
  const byRole = new Map<string, Omit<MatrixCell, "role">>();
  g.ladder.forEach((t, i) => {
    if (t.maxPercent === null) {
      const prev = g.ladder[i - 1]?.maxPercent;
      byRole.set(t.role, { text: prev ? `Above ${percent(prev)}` : "All", kind: "above" });
    } else {
      byRole.set(t.role, { text: percent(t.maxPercent), kind: "limit" });
    }
  });
  for (const r of g.reviewers) byRole.set(r, { text: "All", kind: "all" });
  byRole.set("DEAL_DESK", { text: "All", kind: "all" });
  return MATRIX_COLUMNS.map((role) => ({ role, ...(byRole.get(role) ?? { text: "N/A", kind: "na" as const }) }));
}

/** The matrix's rows, marking what differs from `base` (the saved matrix) when given. */
export function matrixRows(m: Pick<ApprovalMatrix, "groups" | "mappings">, base?: Pick<ApprovalMatrix, "groups" | "mappings">): MatrixRow[] {
  return m.groups.map((g) => {
    const products = groupProducts(m.mappings, g.code);
    const cells = groupCells(g);
    const saved = base?.groups.find((x) => x.code === g.code);
    if (!base || !saved) return { code: g.code, name: g.name, products, cells, isNew: Boolean(base) };
    const savedCells = groupCells(saved);
    const savedProducts = groupProducts(base.mappings, g.code);
    return {
      code: g.code,
      name: g.name,
      products,
      productsWas: savedProducts.join("|") !== products.join("|") ? savedProducts : undefined,
      cells: cells.map((c, i) => (savedCells[i].text !== c.text ? { ...c, was: savedCells[i].text } : c)),
      isNew: false,
    };
  });
}

/** How many rows have an unsaved change. */
export function changedRows(rows: readonly MatrixRow[]): number {
  return rows.filter((r) => r.isNew || r.productsWas || r.cells.some((c) => c.was !== undefined)).length;
}

/** A quote's lines in one group, and the highest approver they need there. */
export interface GroupPlacement {
  readonly lines: readonly { readonly lineNumber: number; readonly productName: string }[];
  readonly reachedRole: string | null;
}

/** The quote's lines by discount group, keeping the furthest approver per group (columns run up the ladder). */
export function placementsOf(preview: Pick<ApprovalPreview, "lines">): Map<string, GroupPlacement> {
  const out = new Map<string, { lines: { lineNumber: number; productName: string }[]; reachedRole: string | null }>();
  const rank = (r: string | null) => (r ? MATRIX_COLUMNS.indexOf(r as MatrixRole) : -1);
  for (const l of preview.lines ?? []) {
    if (!l.groupCode) continue;
    const p = out.get(l.groupCode) ?? { lines: [], reachedRole: null };
    p.lines.push({ lineNumber: l.lineNumber, productName: l.productName });
    if (rank(l.reachedRole) > rank(p.reachedRole)) p.reachedRole = l.reachedRole;
    out.set(l.groupCode, p);
  }
  return out;
}
