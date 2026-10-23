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

import Papa from "papaparse";
import { saveBlob } from "@utils/saveFile";
import type { ReportRow } from "../api/insightsTypes";
import { dealLabel, REPORT_STATUSES } from "./reportFilters";

/** The most rows one export reads; the backend's own cap is the same. */
export const EXPORT_MAX_ROWS = 5000;

type Cell = string | number | Date | null;

interface Column {
  readonly header: string;
  readonly width: number;
  readonly value: (r: ReportRow) => Cell;
  /** An Excel number format; numbers stay numbers, so the sheet can add them up. */
  readonly numFmt?: string;
}

const num = (v: string | null): number | null => (v == null ? null : Number(v));
const date = (v: string | null): Date | null => (v ? new Date(v) : null);
const statusLabel = (s: string) => REPORT_STATUSES.find((x) => x.value === s)?.label ?? s;

/** The export's columns: the report's, with amounts as numbers. */
export function exportColumns(currency: string): readonly Column[] {
  const money = "#,##0.00";
  return [
    { header: "Quote", width: 14, value: (r) => r.quoteNumber },
    { header: "Version", width: 8, value: (r) => r.versionNumber },
    { header: "Status", width: 12, value: (r) => statusLabel(r.status) },
    { header: "Waiting on", width: 28, value: (r) => r.waitingOn.join(", ") || null },
    { header: "Account", width: 30, value: (r) => r.accountName },
    { header: "Opportunity", width: 34, value: (r) => r.opportunityName },
    { header: "Region", width: 8, value: (r) => r.region },
    { header: "Partner", width: 24, value: (r) => r.partnerName },
    { header: "Channel", width: 10, value: (r) => (r.channel === "PARTNER" ? "Partner" : r.channel === "DIRECT" ? "Direct" : null) },
    { header: "Deal", width: 12, value: (r) => dealLabel(r) },
    { header: "Currency", width: 9, value: (r) => r.currency },
    { header: "TCV", width: 14, value: (r) => num(r.tcv), numFmt: money },
    { header: `TCV (${currency})`, width: 14, value: (r) => num(r.tcvConverted), numFmt: money },
    { header: `ARR (${currency})`, width: 14, value: (r) => num(r.arrConverted), numFmt: money },
    { header: "Highest discretionary discount %", width: 12, value: (r) => num(r.maxDiscretionaryPercent), numFmt: "0.00" },
    { header: "Owner", width: 26, value: (r) => r.ownerEmail },
    { header: "Created", width: 18, value: (r) => date(r.createdAt), numFmt: "d mmm yyyy hh:mm" },
    { header: "Submitted", width: 18, value: (r) => date(r.submittedAt), numFmt: "d mmm yyyy hh:mm" },
    { header: "Approved", width: 18, value: (r) => date(r.approvedAt), numFmt: "d mmm yyyy hh:mm" },
    { header: "Days in approval", width: 10, value: (r) => r.daysInApproval, numFmt: "0.0" },
  ];
}

/** The rows as CSV text (dates as ISO, so any tool reads them). */
export function reportCsv(rows: readonly ReportRow[], currency: string): string {
  const cols = exportColumns(currency);
  return Papa.unparse({
    fields: cols.map((c) => c.header),
    data: rows.map((r) => cols.map((c) => {
      const v = c.value(r);
      return v instanceof Date ? v.toISOString() : v ?? "";
    })),
  });
}

/** The rows as an Excel workbook; ExcelJS loads only when someone exports. */
export async function reportXlsx(rows: readonly ReportRow[], currency: string, note: string): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Quotes");
  const cols = exportColumns(currency);
  sheet.columns = cols.map((c) => ({ header: c.header, width: c.width }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  for (const r of rows) {
    const added = sheet.addRow(cols.map((c) => c.value(r)));
    cols.forEach((c, i) => {
      if (c.numFmt) added.getCell(i + 1).numFmt = c.numFmt;
    });
  }
  sheet.addRow([]);
  sheet.addRow([note]).font = { italic: true };
  return workbook.xlsx.writeBuffer();
}

/** A file name with today's date: "cado2-quotes-2026-10-22.xlsx". */
export function exportFileName(ext: "csv" | "xlsx", today: Date = new Date()): string {
  return `cado2-quotes-${today.toISOString().slice(0, 10)}.${ext}`;
}

export async function saveReport(rows: readonly ReportRow[], currency: string, note: string, format: "csv" | "xlsx"): Promise<void> {
  if (format === "csv") {
    // A byte-order mark so Excel opens UTF-8 names correctly.
    saveBlob(new Blob(["﻿" + reportCsv(rows, currency)], { type: "text/csv;charset=utf-8" }), exportFileName("csv"));
    return;
  }
  const buffer = await reportXlsx(rows, currency, note);
  saveBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    exportFileName("xlsx"),
  );
}
