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

import type { JSX } from "react";
import { MonthColumns, HBars } from "../../dashboardParts";
import type { WidgetCtx } from "../types";

const acct = (ctx: WidgetCtx) => ctx.dashboard?.accountManager;


/** The person's engagements by status. */
export function ByStatusWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const a = acct(ctx)?.byStatus;
  if (!a) return null;
  return <HBars rows={a} percent />;
}

/** The person's engagements by start month, the current month and the next five. */
export function ByMonthWidget({ ctx }: { ctx: WidgetCtx }): JSX.Element | null {
  const a = acct(ctx)?.byMonth;
  if (!a) return null;
  return <MonthColumns rows={a} name="Engagements" />;
}
