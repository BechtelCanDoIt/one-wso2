
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

/** The sections a visible widget needs that the default call does not return: those behind no default-on widget. */
export function extraSections(
  allowed: readonly WidgetRef[],
  visible: readonly string[],
  sectionOf: (id: string) => DashboardSectionKey | undefined,
): DashboardSectionKey[] {
  const covered = new Set(allowed.filter((w) => w.defaultOn).map((w) => sectionOf(w.id)));
  const extra: DashboardSectionKey[] = [];
  for (const id of visible) {
    const s = sectionOf(id);
    if (s && !covered.has(s) && !extra.includes(s)) extra.push(s);
  }
  return extra;
}

/** The default sections with those a person turned on added. A section the extra call did not return keeps the default's, and failures are united. */
export function mergeDashboards(base: Dashboard | undefined, extra: Dashboard | undefined): Dashboard | undefined {
  if (!base || !extra) return base;
  const defined = Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined));
  return { ...base, ...defined, failed: [...new Set([...base.failed, ...extra.failed])], widgets: base.widgets };
}
