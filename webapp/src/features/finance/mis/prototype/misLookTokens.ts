// PROTOTYPE (branch prototype/mis-look) — throwaway, never merge.
//
// The source app's look (apps/mis `theme.css`, `TableNavigation.css`,
// `FilterBar.css`, `DataGrid.css`), written as Oxygen theme tokens. This file
// doubles as the TOKEN MAPPING the handoff asks for: every colour, radius and
// weight the real implementation should use is named here once, with the
// source value it stands in for, and the few places no token exists are marked
// `NO TOKEN`.
//
//   source                         token here
//   ------------------------------ ----------------------------------------------
//   --primary-500 #ff7800 fills    primary.main                 (shell's orange)
//   --text-brand  #c2410c text     primary.dark in light, primary.main in dark
//   --primary-50  #fff7ed hover    rgba(primary.mainChannel / .06)
//   rgba(primary, .12) selected    rgba(primary.mainChannel / .12)
//   --primary-300 hover border     primary.light
//   --secondary-50 #f8fafc slate   NO TOKEN — grey.50 light / action.hover dark
//   --secondary-200 #e2e8f0 border divider
//   --secondary-600 #475569 text   text.secondary (NB: Oxygen's text.secondary
//                                  equals text.primary in both shipped themes,
//                                  so "slate for structure" has no tonal step)
//   --bg-primary #fff surfaces     background.paper (translucent in Oxygen;
//                                  composited opaquely where a cell is sticky)
//   --radius-sm/md/lg 4/8/12px     literal px — shape.borderRadius is 12 or 20
//                                  in the shipped themes, so the source radii
//                                  are NOT derivable from the shape token
//   --shadow-sm/md                 theme.shadows[1] / theme.shadows[3]
//   Inter                          typography.fontFamily (already Inter Variable)

import type { Theme } from "@mui/material/styles";
import type { SxProps } from "@mui/material/styles";

/** `var(--oxygen-palette-…)` — the shell's CSS-variable prefix. */
export const cssVar = (path: string) => `var(--oxygen-palette-${path})`;

/** The primary at an alpha, scheme-aware: tints the shell's orange, never #ff7800. */
export const primaryTint = (alpha: number) =>
  `rgba(${cssVar("primary-mainChannel")} / ${alpha})`;

/**
 * Orange TEXT, contrast-safe: `primary.dark` on light surfaces (what the a11y
 * overlay already does for outlined primary chips and buttons), `primary.main`
 * in dark mode where the orange clears AA on its own.
 */
export const brandText = (theme: Theme) => ({
  color: cssVar("primary-main"),
  ...theme.applyStyles("light", { color: cssVar("primary-dark") }),
});

/** The source's slate fill for structure (section rows, pill rests). NO TOKEN. */
export const slateFill = (theme: Theme) => ({
  backgroundColor: cssVar("action-hover"),
  ...theme.applyStyles("light", { backgroundColor: cssVar("grey-50") }),
});

/**
 * The source's table TEXT: every header, label and figure in a grid is
 * `--secondary-600` `#475569` (measured on mis-stg 2026-10-07 — AG Grid's
 * `--ag-foreground-color`), never the near-black body text. NO TOKEN: Oxygen's
 * `text.secondary` equals `text.primary`, so the step is a literal in light and
 * `grey.400` in dark, where the source has no answer.
 */
export const slateText = (theme: Theme) => ({
  color: cssVar("grey-400"),
  ...theme.applyStyles("light", { color: "#475569" }),
});

/** The units caption under a grid title: 12px/500 `#6b778c` (measured). NO TOKEN. */
export const slateMutedText = (theme: Theme) => ({
  color: cssVar("grey-500"),
  ...theme.applyStyles("light", { color: "#6b778c" }),
});

/**
 * The source's `--shadow-md`, the one shadow a grid card wears (measured on
 * `.data-grid-container`). Dropped in dark, where a shadow on black is noise.
 */
export const cardShadow = (theme: Theme) => ({
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
  ...theme.applyStyles("dark", { boxShadow: "none" }),
});

/**
 * The grid's measured geometry (mis-stg, AG Grid Quartz at 14px, grid size 8):
 * row 42px, header 48px, section band 44px, cell padding 16px.
 */
export const GRID = { rowHeight: 42, headerHeight: 48, sectionHeight: 44, cellPadX: "16px" } as const;

/** The orange gradient the source paints a grand total with. */
export const primaryGradient = `linear-gradient(135deg, ${cssVar("primary-main")}, ${cssVar("primary-dark")})`;

/** Source radii, as literals — see the header note. */
export const RADIUS = { sm: "4px", md: "8px", lg: "12px", pill: "999px" } as const;

// ---- Period segments (SegmentedFilter.js) ------------------------------------

export const periodSegmentSx = (pressed: boolean) => (theme: Theme) => ({
  height: 32,
  px: "12px",
  minWidth: 96,
  borderRadius: RADIUS.md,
  border: "1px solid",
  borderColor: pressed ? cssVar("primary-main") : cssVar("divider"),
  backgroundColor: pressed ? primaryTint(0.12) : "transparent",
  color: pressed ? cssVar("text-primary") : cssVar("text-secondary"),
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: pressed ? 700 : 500,
  whiteSpace: "nowrap",
  transition: "all 150ms ease-in-out",
  "&:hover": {
    borderColor: cssVar("primary-main"),
    backgroundColor: pressed ? primaryTint(0.18) : primaryTint(0.08),
    color: cssVar("text-primary"),
  },
  "&.Mui-focusVisible": { outline: `2px solid ${cssVar("primary-main")}`, outlineOffset: 2 },
  ...theme.applyStyles("dark", {
    borderColor: pressed ? cssVar("primary-main") : "rgba(255,255,255,0.18)",
  }),
});

// ---- Table tabs (TableNavigation.css .table-nav-tab) ---------------------------

export const underlineTabRowSx: SxProps<Theme> = {
  display: "flex",
  flexWrap: "wrap",
  gap: 0.5,
  borderBottom: "1px solid",
  borderColor: "divider",
  mb: 1.5,
};

export const underlineTabSx = (active: boolean) => (theme: Theme) => ({
  background: "transparent",
  border: "none",
  borderBottom: "3px solid transparent",
  borderBottomColor: active ? cssVar("primary-main") : "transparent",
  borderRadius: `${RADIUS.sm} ${RADIUS.sm} 0 0`,
  px: "10px",
  py: "14px",
  fontFamily: "inherit",
  fontSize: "0.875rem",
  fontWeight: 600,
  lineHeight: 1,
  color: active ? cssVar("text-primary") : cssVar("text-secondary"),
  // Oxygen's text.secondary equals text.primary, so the resting tab needs the
  // step the source gets for free: opacity stands in for the slate 600.
  opacity: active ? 1 : 0.72,
  transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    ...brandText(theme),
    opacity: 1,
    borderBottomColor: active ? cssVar("primary-main") : cssVar("primary-light"),
  },
  "&.Mui-focusVisible": { outline: `2px solid ${cssVar("primary-main")}`, outlineOffset: 2 },
});

// ---- Unit pills (TableNavigation.css .table-nav-subtab) -----------------------

export const unitPillSx = (active: boolean) => (theme: Theme) => ({
  height: 28,
  px: "12px",
  borderRadius: RADIUS.pill,
  border: "1px solid",
  borderColor: active ? cssVar("primary-main") : cssVar("divider"),
  backgroundColor: active ? primaryTint(0.12) : "transparent",
  color: cssVar("text-primary"),
  opacity: active ? 1 : 0.78,
  fontFamily: "inherit",
  fontSize: "0.8125rem",
  fontWeight: active ? 700 : 500,
  whiteSpace: "nowrap",
  transition: "all 150ms ease-in-out",
  "&:hover": {
    opacity: 1,
    borderColor: cssVar("primary-light"),
    backgroundColor: active ? primaryTint(0.16) : primaryTint(0.06),
  },
  "&.Mui-focusVisible": { outline: `2px solid ${cssVar("primary-main")}`, outlineOffset: 2 },
  ...theme.applyStyles("dark", {
    borderColor: active ? cssVar("primary-main") : "rgba(255,255,255,0.18)",
  }),
});

// ---- Filter card (FilterBar.css .filter-bar) -----------------------------------

/** The white→slate gradient card, light border, 12px radius, soft shadow. */
export const gradientCardSx = (theme: Theme) => ({
  p: 1.5,
  borderRadius: RADIUS.lg,
  border: "1px solid",
  borderColor: cssVar("divider"),
  background: `linear-gradient(180deg, ${cssVar("background-paper")}, ${cssVar("grey-50")})`,
  boxShadow: "0 6px 16px -10px rgba(15, 23, 42, 0.28)",
  ...theme.applyStyles("dark", {
    background: `linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
    boxShadow: "none",
  }),
});

/** The source's text button: uppercase 12px/700, letter-spacing .35px, 8px radius. */
export const faithfulTextButtonSx = (theme: Theme) => ({
  textTransform: "uppercase",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.35px",
  borderRadius: RADIUS.md,
  px: "10px",
  py: "6px",
  color: cssVar("text-secondary"),
  opacity: 0.85,
  "&:hover": { ...brandText(theme), opacity: 1, backgroundColor: primaryTint(0.08) },
});

/** The source's Apply: filled primary, uppercase 12px/600, 4px radius. */
export const faithfulApplySx = {
  textTransform: "uppercase",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.5px",
  borderRadius: RADIUS.sm,
  px: 1,
  py: "4px",
  boxShadow: 1,
  "&:not(:disabled)": { background: cssVar("primary-main"), color: cssVar("primary-contrastText") },
  "&:hover:not(:disabled)": { background: cssVar("primary-dark"), boxShadow: 3 },
} as const;

/** The source's outlined button: primary border, brand text, uppercase 12px/700, 8px radius. */
export const faithfulOutlinedSx = (theme: Theme) => ({
  textTransform: "uppercase",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.35px",
  borderRadius: RADIUS.md,
  px: "10px",
  py: "5px",
  borderColor: cssVar("primary-main"),
  ...brandText(theme),
  "&:hover": { backgroundColor: primaryTint(0.12), borderColor: cssVar("primary-dark") },
});

/** Applied-filter chips: primary tint, brand text, 700. */
export const faithfulChipSx = (theme: Theme) => ({
  height: 24,
  fontSize: 12,
  fontWeight: 700,
  backgroundColor: primaryTint(0.12),
  border: `1px solid ${primaryTint(0.24)}`,
  ...brandText(theme),
  "& .MuiChip-deleteIcon": { color: "inherit", opacity: 0.7, "&:hover": { opacity: 1 } },
});

// ---- Per-grid header (DataGrid.css .data-grid-header) --------------------------

/**
 * The top of the ONE card the source puts a grid in (`.data-grid-container`:
 * 1px `--border-light`, 4px radius, `--shadow-md`). The header is this card's
 * head and the grid frame below is its body; the two meet on the header's
 * bottom rule, so the shadow sits on the frame alone — a shadow on the header
 * would fall across the grid's first rows.
 */
export const gridHeaderBarSx = (theme: Theme) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  // `as const`: csstype's FlexWrap is a closed union, so a widened `string`
  // fails SxProps once `applyStyles` is spread in beside it.
  flexWrap: "wrap" as const,
  gap: 1.5,
  px: 2,
  pt: 1.5,
  pb: 1.25,
  backgroundColor: cssVar("background-paper"),
  border: "1px solid",
  borderBottom: 0,
  borderColor: cssVar("divider"),
  borderRadius: `${RADIUS.sm} ${RADIUS.sm} 0 0`,
  ...theme.applyStyles("dark", { backgroundColor: "rgba(255,255,255,0.03)" }),
});

/** The Table title — measured: Inter 24px/600, -0.025em, line-height 1.6, brand text. */
export const gridTitleSx = (theme: Theme) => ({
  m: 0,
  fontSize: "1.5rem",
  fontWeight: 600,
  letterSpacing: "-0.025em",
  lineHeight: 1.6,
  ...brandText(theme),
});

/** The units caption — measured: 12px/500, `#6b778c`. */
export const gridCaptionSx = (theme: Theme) => ({
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 500,
  lineHeight: 1.66,
  ...slateMutedText(theme),
});

/** The source's Export: filled primary, uppercase 12px/600, 4px radius. */
export const faithfulExportSx = faithfulApplySx;

// ---- The grid (DataGrid.css AG Grid quartz overrides) --------------------------

/**
 * The body of the grid card — see `gridHeaderBarSx`. Square top corners meet
 * the header; the card's shadow lives here.
 */
export const faithfulGridFrameSx = (theme: Theme) => ({
  border: "1px solid",
  borderColor: cssVar("divider"),
  borderRadius: `0 0 ${RADIUS.sm} ${RADIUS.sm}`,
  overflow: "hidden",
  backgroundColor: cssVar("background-paper"),
  ...cardShadow(theme),
});

/**
 * Header cell — measured: ONE 48px row, white, text 14px/700 slate, no
 * uppercase, a `--border-light` rule between cells, Period labels right-aligned
 * and wrapping ("2021/12/31 -" over "2022/10/07"), "Summary" left.
 */
export const faithfulHeadCellSx = (theme: Theme) => ({
  height: GRID.headerHeight,
  boxSizing: "border-box" as const,
  fontSize: "0.875rem",
  fontWeight: 700,
  letterSpacing: 0,
  textTransform: "none" as const,
  lineHeight: 1.25,
  whiteSpace: "normal" as const,
  verticalAlign: "middle" as const,
  py: 0.5,
  px: GRID.cellPadX,
  borderRight: "1px solid",
  borderRightColor: "divider",
  ...slateText(theme),
});

/** Section row label — measured: 11px/700 uppercase, .4px tracking, slate, at the band's foot. */
export const sectionLabelSx = (theme: Theme) => ({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.4px",
  textTransform: "uppercase" as const,
  lineHeight: 1.3,
  ...slateText(theme),
});

/**
 * The section band's cells — measured: 44px tall, `--bg-secondary`, the label
 * sitting at the bottom (`align-items: flex-end`, 2px up), no column rules.
 */
export const sectionCellSx = (theme: Theme) => ({
  ...slateFill(theme),
  height: GRID.sectionHeight - 1,
  verticalAlign: "bottom" as const,
  pb: "4px",
});

/**
 * A figure — measured: 14px/400 slate, right-aligned, 16px side padding, the
 * row 42px tall, and NO vertical rule between data cells (AG's
 * `--ag-cell-horizontal-border` is transparent); bold rows go to 600 via
 * `rowSx`.
 */
export const faithfulNumericSx = (theme: Theme) => ({
  height: GRID.rowHeight - 1,
  boxSizing: "border-box" as const,
  fontSize: "0.875rem",
  fontWeight: 400,
  lineHeight: 1.25,
  py: 0,
  px: GRID.cellPadX,
  borderLeft: 0,
  ...slateText(theme),
});

/**
 * A row header — measured: 14px/400 slate, 12.8px left inset, no indent under
 * a section, and the pinned column's `--border-light` right rule.
 */
export const faithfulRowLabelSx = (theme: Theme) => ({
  height: GRID.rowHeight - 1,
  boxSizing: "border-box" as const,
  fontSize: "0.875rem",
  fontWeight: 400,
  lineHeight: 1.25,
  py: 0,
  pl: "12.8px",
  pr: 1,
  borderRightColor: "divider",
  ...slateText(theme),
});

/**
 * Grand total column (Customers' Total): orange gradient, white text, 700.
 * The white is declared under `applyStyles("light")` too, because `slateText`
 * sets its light colour that way and a plain `color` loses to it.
 */
export const grandTotalCellSx = (theme: Theme) => ({
  backgroundColor: "transparent",
  backgroundImage: primaryGradient,
  color: cssVar("primary-contrastText"),
  fontWeight: 700,
  ...theme.applyStyles("light", { color: cssVar("primary-contrastText") }),
});
