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

// The Deal Desk board (D130), as GET /desk/columns/{column} returns it.

/** The board's four columns. */
export type DeskColumnKey = "review" | "others" | "back" | "approved";

/** One quote on the board. */
export interface DeskCard {
  readonly quoteId: number;
  readonly quoteNumber: string | null;
  readonly versionNumber: number;
  readonly status: "SUBMITTED" | "RETURNED" | "RECALLED" | "APPROVED";
  readonly accountName: string | null;
  readonly opportunityName: string | null;
  readonly ownerEmail: string;
  readonly region: string | null;
  readonly dealType: "FIRST_SALE" | "RENEWAL" | "EXPANSION" | "OTHER";
  readonly channel: string | null;
  readonly partnerName: string | null;
  readonly isPrimary: boolean;
  readonly currency: string | null;
  readonly tcv: string;
  /** At Salesforce's rate on the submission day; null without a rate. */
  readonly tcvUsd: string | null;
  readonly submittedAt: string | null;
  /** Deal Desk's deadline in "Your review", else the earliest pending approval's. */
  readonly dueAt: string | null;
  readonly resubmitted: boolean;
  readonly submittedByYou: boolean;
  readonly waitingOn: readonly string[];
  readonly waitingOnRoles: readonly string[];
  readonly approvedSteps: number;
  readonly totalSteps: number;
  /** A pending approval is overdue and Deal Desk may approve it for its approver (D120). */
  readonly overdueOnBehalf: boolean;
  readonly returnedBy: string | null;
  readonly returnComment: string | null;
  /** The quote's last change: how long it's been untouched. */
  readonly changedAt: string;
  readonly approvedAt: string | null;
}

/** One column: how many quotes match, and a page of them. */
export interface DeskColumn {
  readonly column: DeskColumnKey;
  readonly total: number;
  readonly items: readonly DeskCard[];
}
