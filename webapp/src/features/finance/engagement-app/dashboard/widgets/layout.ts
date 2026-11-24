
import type { WidgetRef } from "../../api/dashboardTypes";
import type { Dashboard } from "../../api/engagementTypes";
import type { WidgetDef } from "./types";

/** One row of the dashboard: the controls bar, a full-width widget, or a run of half-width ones. */
export type LayoutBlock =
  | { readonly kind: "controls" }
  | { readonly kind: "full"; readonly def: WidgetDef }
  | { readonly kind: "halves"; readonly defs: readonly WidgetDef[] };

/** Lays out widgets in the order given: full widgets alone, consecutive half widgets side by side, and the Travel Costs controls once above the first Travel Costs widget. */
export function layoutBlocks(defs: readonly WidgetDef[]): LayoutBlock[] {
  const blocks: LayoutBlock[] = [];
  let controls = false;
  for (const def of defs) {
    if (def.group === "travelCosts" && !controls) {
      blocks.push({ kind: "controls" });
      controls = true;
    }
    if (def.size === "full") {
      blocks.push({ kind: "full", def });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last?.kind === "halves") blocks[blocks.length - 1] = { kind: "halves", defs: [...last.defs, def] };
    else blocks.push({ kind: "halves", defs: [def] });
  }
  return blocks;
}

/**
 * The widgets to offer when the backend sends no `widgets` list (an older backend): those whose data came back, all on by default.
 * `today` is whether the person may see Allocations Today.
 */
export function legacyWidgets(d: Dashboard, today: boolean): WidgetRef[] {
  const on = (id: string, present: boolean): WidgetRef[] => (present ? [{ id, defaultOn: true }] : []);
  return [
    ...on("my-work", Boolean(d.myWork) || d.failed.includes("myWork")),
    ...on("waiting-on-you", Boolean(d.queue)),
    ...on("travel", Boolean(d.travel) || d.failed.includes("travel")),
    ...on("engagements", Boolean(d.engagements) || d.failed.includes("engagements")),
    ...on("available-consultants", Boolean(d.available) || d.failed.includes("availableConsultants")),
    ...on("allocations-today", today),
    ...on("allocations-over-time", Boolean(d.allocationsOverTime) || d.failed.includes("allocationsOverTime")),
  ];
}
