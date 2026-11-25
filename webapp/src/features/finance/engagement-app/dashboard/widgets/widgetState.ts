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

import type { Dashboard } from "../../api/engagementTypes";
import type { WidgetRef } from "../../api/dashboardTypes";
import type { DashboardSectionKey, SectionState, WidgetCtx, WidgetDef, WidgetState } from "./types";

/** What a widget shows right now: its skeleton, a failure with Retry, its empty text, or its body. */
export function widgetState(def: WidgetDef, ctx: WidgetCtx): WidgetState {
  if (def.source === "own") return { kind: "ready" };
  if (def.source === "cost") {
    const q = ctx.cost.query;
    if (q.isError) return { kind: "failed", error: q.error };
    if (q.isPending) return { kind: "loading" };
    return def.isEmpty?.(ctx) ? { kind: "empty" } : { kind: "ready" };
  }
  const s: SectionState = def.section ? ctx.section(def.section) : { status: "loaded" };
  if (s.status === "loading") return { kind: "loading" };
  if (s.status === "failed") return { kind: "failed", error: s.error };
  if (def.present && !def.present(ctx)) return { kind: "absent" };
  return def.isEmpty?.(ctx) ? { kind: "empty" } : { kind: "ready" };
}

/** Sections that the backend builds from one entity call: asked for in one request, so none of that work is done twice. */
const SHARED_CALL: readonly (readonly DashboardSectionKey[])[] = [["engagements", "availableConsultants", "allocationsOverTime"]];

/** One request of `GET /dashboard?sections=`: the sections it asks for, and whether any widget on screen reads them. */
export interface SectionGroup {
  readonly sections: readonly DashboardSectionKey[];
  readonly needed: boolean;
}

/**
 * The requests that fill the widgets: one per group of sections. A group asks for every section the caller may see in it (so hiding or
 * showing one widget does not change the request or refetch its neighbours) and is only `needed` while a visible widget reads one of them.
 * The backend still returns a section only for a widget the caller may see.
 */
export function sectionGroups(
  allowed: readonly WidgetRef[],
  visible: readonly string[],
  sectionOf: (id: string) => DashboardSectionKey | undefined,
): SectionGroup[] {
  const offered: DashboardSectionKey[] = [];
  for (const w of allowed) {
    const s = sectionOf(w.id);
    if (s && !offered.includes(s)) offered.push(s);
  }
  const used = new Set(visible.map(sectionOf));
  const groups: SectionGroup[] = [];
  const placed = new Set<DashboardSectionKey>();
  for (const s of offered) {
    if (placed.has(s)) continue;
    const together = SHARED_CALL.find((g) => g.includes(s));
    const sections = together ? together.filter((k) => offered.includes(k)) : [s];
    sections.forEach((k) => placed.add(k));
    groups.push({ sections, needed: sections.some((k) => used.has(k)) });
  }
  return groups;
}

/** The default sections with those a person turned on added. A section the extra call did not return keeps the default's, and failures are united. */
export function mergeDashboards(base: Dashboard | undefined, extra: Dashboard | undefined): Dashboard | undefined {
  if (!base || !extra) return base;
  const defined = Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined));
  return { ...base, ...defined, failed: [...new Set([...base.failed, ...extra.failed])], widgets: base.widgets };
}
