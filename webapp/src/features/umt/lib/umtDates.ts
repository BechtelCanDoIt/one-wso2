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

// Shared display-date formatting for UMT screens. Not for building
// machine-readable date strings (see @utils/localDate for that).

// A trailing "Z" or "±hh:mm" / "±hhmm" offset, or an ISO date-only string,
// which the Date constructor also reads as UTC.
const UTC_ANCHORED_DATE = /(?:Z|[+-]\d{2}:?\d{2})$|^\d{4}-\d{2}-\d{2}$/i;

// The estimate fields are java.util.Date on the backend but MEAN a calendar
// date. They arrive either as a zoned instant ("2026-10-01T00:00:00.000Z") or
// as a wall-clock time with no zone ("Nov 12, 2026 12:00:00 AM"), which the
// Date constructor reads as local time. Read zoned values by their UTC day and
// zoneless ones by their local day, so neither form shifts at any UTC offset.
// Returns that day as local midnight, for DatePicker and day-of-week checks.
export function parseCalendarDate(value?: string | null): Date | null {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return null;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return null;
  return UTC_ANCHORED_DATE.test(normalizedValue)
    ? new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    : new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Deliberately not used for genuine instants — reportedDate and the like are
// real points in time, and showing those in the reader's own zone is correct.
export function formatCalendarDate(value?: string | null): string {
  const date = parseCalendarDate(value);
  if (!date) return "N/A";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDate(value?: string | null): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTimestamp(value?: string | null): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    second: "2-digit",
    year: "numeric",
  });
}
