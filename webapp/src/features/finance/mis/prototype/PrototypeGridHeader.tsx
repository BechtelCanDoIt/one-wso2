// PROTOTYPE (branch prototype/mis-look) — throwaway, never merge.
//
// D4 step 5: the per-grid header — Table title in brand text · units caption
// ("All amounts in USD" / "… in USD '000") · Values in '000 toggle · BU only /
// Totals only where applicable · Export ▾. The title sits HERE, under the tabs,
// because it survives a crop into a slide (D10). Scale leaves the filter area
// and lives beside the figures it rewrites (D4).
//
//   A, C  the source's `.data-grid-header`, measured on mis-stg 2026-10-07: the
//         head of the grid card (1px border, 4px radius), 24px/600 title in
//         brand text, 12px/500 caption, a primary CHECKBOX for the Scale (not a
//         Switch — the handoff read `.thousands-toggle` off the CSS; the live
//         control is a MUI Checkbox), primary checkboxes with slate 500 labels
//         for BU only / Totals only, filled Export
//   B     Oxygen: subtitle1 title, Checkbox for the Scale, contained Export

import type { ReactNode } from "react";
import { Box, Checkbox, FormControlLabel, Stack, Typography } from "@wso2/oxygen-ui";
import { MIS_SCALES, type MisScale } from "../util/misViewVocabulary";
import { amountUnitCaption } from "../util/misMoney";
import { useMisLook } from "./misLookPrototype";
import { gridCaptionSx, gridHeaderBarSx, gridTitleSx, slateText } from "./misLookTokens";

export interface GridToggle {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function PrototypeGridHeader({
  title,
  note,
  scale,
  onScale,
  toggles = [],
  exportMenu,
}: {
  /** The Table's title — "Subscription · BU Build (All)", "Customers", … */
  title: string;
  /** An italic aside after the title, e.g. the Channel/Direct note. */
  note?: string;
  scale: MisScale;
  onScale: (scale: MisScale) => void;
  /** BU only / Totals only, where the table offers them. */
  toggles?: readonly GridToggle[];
  exportMenu?: ReactNode;
}) {
  const look = useMisLook();
  const thousands = scale === MIS_SCALES.THOUSANDS;
  const setThousands = (on: boolean) => onScale(on ? MIS_SCALES.THOUSANDS : MIS_SCALES.UNITS);

  if (look.gridHeader === "oxygen") {
    return (
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 1 }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {title}
            {note && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontStyle: "italic" }}>
                {note}
              </Typography>
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {amountUnitCaption(scale)}
          </Typography>
        </Box>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <FormControlLabel
            sx={{ m: 0 }}
            control={<Checkbox size="small" checked={thousands} onChange={(event) => setThousands(event.target.checked)} />}
            label={<Typography variant="body2">Values in &apos;000</Typography>}
          />
          {toggles.map((toggle) => (
            <FormControlLabel
              key={toggle.label}
              sx={{ m: 0 }}
              control={<Checkbox size="small" checked={toggle.checked} onChange={(event) => toggle.onChange(event.target.checked)} />}
              label={<Typography variant="body2">{toggle.label}</Typography>}
            />
          ))}
          {exportMenu}
        </Stack>
      </Stack>
    );
  }

  return (
    <Box sx={[gridHeaderBarSx]}>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography component="h3" sx={[gridTitleSx]}>
            {title}
          </Typography>
          {note && (
            <Typography component="span" sx={{ fontSize: "0.8rem", fontStyle: "italic", color: "text.secondary" }}>
              {note}
            </Typography>
          )}
        </Stack>
        <Typography variant="caption" sx={[gridCaptionSx]}>
          {amountUnitCaption(scale)}
        </Typography>
      </Box>
      {/* Measured: the controls sit on the title's baseline row, 14px/500 slate
          labels, primary checkboxes, the Export at the end. */}
      <Stack direction="row" sx={{ alignItems: "center", gap: 2, flexWrap: "wrap", pt: "4px" }}>
        {[{ label: "Values in '000", checked: thousands, onChange: setThousands }, ...toggles].map((toggle) => (
          <FormControlLabel
            key={toggle.label}
            sx={{ m: 0 }}
            control={
              <Checkbox
                size="small"
                checked={toggle.checked}
                onChange={(event) => toggle.onChange(event.target.checked)}
                sx={{ p: 0.5, color: "primary.main", "&.Mui-checked": { color: "primary.main" } }}
              />
            }
            label={
              <Typography component="span" sx={[{ fontSize: "0.875rem", fontWeight: 500, ml: 0.5 }, slateText]}>
                {toggle.label}
              </Typography>
            }
          />
        ))}
        {exportMenu}
      </Stack>
    </Box>
  );
}
