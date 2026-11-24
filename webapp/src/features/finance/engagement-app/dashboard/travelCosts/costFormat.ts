
import type { CostLine, Delta } from "../../api/dashboardTypes";
import { fmtDate, money, usdShort, n0, n2 } from "../../model/format";

export const THIN_TEXT = "No comparison: little data last year";

/** Spend: more is worse. Volume (trips, travellers): neither better nor worse. */
export type DeltaMeaning = "spend" | "volume";

/** The colour of a change: red when spend went up, green when it went down, none for volume or no comparison. The arrow and text always say it too. */
export function deltaTone(d: Delta, compared: boolean, meaning: DeltaMeaning): "error" | "success" | undefined {
  if (!compared || meaning === "volume" || d.thin || !d.changePercent) return undefined;
  return d.changePercent > 0 ? "error" : "success";
}

/** Whole US dollars with separators, for a figure tile: "USD 12,944". */
export const usd0 = (v: number): string => `USD ${n0(v)}`;

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

/** "24 Nov 2026 08:15 UTC" from the backend's ISO time. */
export function utcStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fmtDate(iso.slice(0, 10))} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}
