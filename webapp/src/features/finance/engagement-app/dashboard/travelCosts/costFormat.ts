
import type { CostLine, Delta } from "../../api/dashboardTypes";
import { money, usdShort, n2 } from "../../model/format";

export const THIN_TEXT = "No comparison: little data last year";

/** "▲ 12% vs last year", "▼ 8% vs last year", the thin-data sentence, or nothing when the comparison is off. Never colour alone. */
export function deltaText(d: Delta, compared: boolean): string | undefined {
  if (!compared) return undefined;
  if (d.thin || d.changePercent === undefined) return THIN_TEXT;
  if (d.changePercent === 0) return "No change vs last year";
  const pct = `${Math.abs(d.changePercent).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
  return `${d.changePercent > 0 ? "▲" : "▼"} ${pct} vs last year`;
}

/** The short form for a table cell: "▲ 12%", "▼ 8%", or "n/a" when there is nothing to compare. */
export function deltaCell(d: Delta, compared: boolean): string {
  if (!compared) return "";
  if (d.thin || d.changePercent === undefined) return "n/a";
  if (d.changePercent === 0) return "0%";
  return `${d.changePercent > 0 ? "▲" : "▼"} ${Math.abs(d.changePercent).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

/** USD with cents, for a transaction or a total in a table. */
export const usd2 = (v: number): string => `USD ${n2(v)}`;

export { usdShort };

/** The line's amount as the source recorded it: "LKR 152,000", or "Unknown currency 15.00" when the source named none. */
export function originalText(l: Pick<CostLine, "originalAmount" | "originalCurrency">): string {
  return l.originalCurrency ? money(l.originalAmount, l.originalCurrency) : `Unknown currency ${n2(l.originalAmount)}`;
}

/** How the backend got a line's USD amount, in words. */
export function rateSourceText(l: Partial<Pick<CostLine, "rateSource" | "rate" | "rateDate">>): string {
  if (l.rate === undefined) return "Not converted: no NetSuite rate for this currency and month";
  switch (l.rateSource) {
    case "recorded":
      return "Recorded in USD";
    case "card":
      return "Billed to the card in USD";
    case "today":
      return "NetSuite's rate today";
    case "month-end":
      return "NetSuite's month-end rate";
    default:
      return l.rateDate ? "NetSuite's rate" : "Recorded in USD";
  }
}

export const SOURCE_NOUN = { invoice: "Travel Invoice", perDiem: "Per Diem", card: "Credit Card Expense", claim: "Expense Claim" } as const;

export const PAID_LABEL = { paid: "Paid", nonPaid: "Non-Paid", unknown: "Unknown" } as const;

/** The chip tone for an engagement's paid kind. */
export const PAID_TONE = { paid: "success", nonPaid: "default", unknown: "warning" } as const;
