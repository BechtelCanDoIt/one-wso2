
import { useId, useState, type JSX } from "react";
import { Box, Card, Skeleton, Typography } from "@wso2/oxygen-ui";
import { DownloadIcon, EyeOffIcon, PinIcon, PinOffIcon } from "@wso2/oxygen-ui-icons-react";
import type { RowAction } from "../../components/EaTable";
import { RowMenu } from "../../components/RowActions";
import { Failed } from "../../components/ListCard";
import { Calm, KpiRow } from "../dashboardParts";
import type { WidgetCtx, WidgetDef } from "./types";
import { widgetState } from "./widgetState";

/** Widgets that are a row of figures: their skeleton is a row of tiles. */
const TILE_WIDGETS = new Set(["tc-kpis", "tt-glance", "waiting-on-you"]);

function WidgetSkeleton({ id }: { id: string }): JSX.Element {
  if (TILE_WIDGETS.has(id)) {
    return (
      <Box aria-busy="true" aria-label="Loading">
        <KpiRow>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </KpiRow>
      </Box>
    );
  }
  return (
    <Box aria-busy="true" aria-label="Loading">
      <Skeleton variant="rounded" height={170} />
    </Box>
  );
}

/** A widget: a card with its title, note and menu, and below them its skeleton, its failure with Retry, its empty text, or its body. */
export default function WidgetFrame({
  def,
  ctx,
  pinned,
  onHide,
  onPin,
}: {
  def: WidgetDef;
  ctx: WidgetCtx;
  pinned: boolean;
  onHide: () => void;
  onPin: () => void;
}): JSX.Element {
  const titleId = useId();
  const [exporting, setExporting] = useState(false);
  const state = widgetState(def, ctx);
  const heading = def.heading?.(ctx) ?? def.title;
  const note = typeof def.note === "function" ? def.note(ctx) : def.note;
  const dim = def.source === "cost" && ctx.cost.query.isPlaceholderData;
  const items: RowAction[] = [
    { label: pinned ? "Unpin" : "Pin to Top", icon: pinned ? <PinOffIcon size={15} /> : <PinIcon size={15} />, onClick: onPin },
    { label: "Hide Widget", icon: <EyeOffIcon size={15} />, onClick: onHide },
    ...(def.csv
      ? [
          {
            label: exporting ? "Exporting…" : "Export CSV",
            icon: <DownloadIcon size={15} />,
            disabled: exporting,
            onClick: () => {
              setExporting(true);
              void ctx.cost.exportCsv(def.csv!).finally(() => setExporting(false));
            },
          },
        ]
      : []),
  ];
  const Body = def.Component;
  const retry = () => (def.source === "cost" ? void ctx.cost.query.refetch() : ctx.retry());
  return (
    <Card variant="outlined" component="section" aria-labelledby={titleId} sx={{ p: 2, minWidth: 0, height: "100%", boxSizing: "border-box" }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h2" id={titleId} sx={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {heading}
          </Typography>
          {note ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {note}
            </Typography>
          ) : null}
        </Box>
        <RowMenu items={items} label={heading} />
      </Box>
      {state.kind === "loading" ? (
        <WidgetSkeleton id={def.id} />
      ) : state.kind === "failed" ? (
        <Failed what={heading} error={state.error ?? null} onRetry={retry} retrying={def.source === "cost" ? ctx.cost.query.isFetching : ctx.retrying} />
      ) : state.kind === "empty" ? (
        <Calm>{def.empty}</Calm>
      ) : (
        <Box sx={{ opacity: dim ? 0.55 : 1, transition: "opacity 120ms" }} aria-busy={dim || undefined}>
          <Body ctx={ctx} />
        </Box>
      )}
    </Card>
  );
}
