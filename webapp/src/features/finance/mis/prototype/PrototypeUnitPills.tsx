// PROTOTYPE (branch prototype/mis-look) — throwaway, never merge.
//
// D4 step 3: the Unit pills under a Build tab. The category itself now lives in
// the seven tabs above, so this row is only the units OF that category — or,
// under Custom Build, the two chip lists (Business Units / Product Units) and
// Reset, exactly as the port's `MisUnitTabs` already draws them.
//
//   A, C  the source's `.table-nav-subtab`: 999px pills, light border, primary
//         border + 12% tint + 700 when selected
//   B     Oxygen ToggleButtonGroup / Chip

import { Box, Button, ButtonBase, Chip, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@wso2/oxygen-ui";
import { RotateCcwIcon } from "@wso2/oxygen-ui-icons-react";
import { MIS_UNITS_BY_CATEGORY, formatUnitLabel, unitCategoryOf } from "../util/misUnits";
import { CUSTOM_UNIT } from "../util/misViewVocabulary";
import type { MisUnitSelection } from "../components/MisUnitTabs";
import { useMisLook } from "./misLookPrototype";
import { faithfulOutlinedSx, gradientCardSx, unitPillSx } from "./misLookTokens";

export default function PrototypeUnitPills({
  selection,
  businessUnitOptions,
  productUnitOptions,
  onChange,
}: {
  selection: MisUnitSelection;
  businessUnitOptions: readonly string[];
  productUnitOptions: readonly string[];
  onChange: (next: MisUnitSelection) => void;
}) {
  const look = useMisLook();
  const category = unitCategoryOf(selection.buProductSelection);

  const chooseUnit = (code: string) =>
    onChange({ buProductSelection: code, customBusinessUnits: [], customProductUnits: [] });

  const toggleCustom = (which: "customBusinessUnits" | "customProductUnits", code: string) => {
    const current = selection[which];
    const next = current.includes(code) ? current.filter((item) => item !== code) : [...current, code];
    onChange({
      buProductSelection: CUSTOM_UNIT,
      customBusinessUnits: which === "customBusinessUnits" ? next : [],
      customProductUnits: which === "customProductUnits" ? next : [],
    });
  };

  if (category === "Custom") {
    const reset = () =>
      onChange({ buProductSelection: CUSTOM_UNIT, customBusinessUnits: [], customProductUnits: [] });
    const body = (
      <>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Select a combination of either a set of Business Units or Product Units.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RotateCcwIcon size={14} />}
            onClick={reset}
            sx={look.filterButtons === "faithful" ? faithfulOutlinedSx : undefined}
          >
            Reset
          </Button>
        </Stack>
        <CustomGroup label="Business Units" options={businessUnitOptions} selected={selection.customBusinessUnits} onToggle={(code) => toggleCustom("customBusinessUnits", code)} />
        <CustomGroup label="Product Units" options={productUnitOptions} selected={selection.customProductUnits} onToggle={(code) => toggleCustom("customProductUnits", code)} />
      </>
    );
    return look.filterCard === "gradient" ? (
      <Box sx={[{ mb: 1.5 }, gradientCardSx]}>{body}</Box>
    ) : (
      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>{body}</Paper>
    );
  }

  const units = MIS_UNITS_BY_CATEGORY[category];

  if (look.unitPills === "toggle") {
    return (
      <ToggleButtonGroup
        exclusive
        size="small"
        value={selection.buProductSelection}
        aria-label="Unit"
        onChange={(_, next: string | null) => next && chooseUnit(next)}
        sx={{ mb: 1.5, flexWrap: "wrap" }}
      >
        {units.map((unit) => (
          <ToggleButton key={unit.code} value={unit.code} sx={{ textTransform: "none" }}>
            {unit.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    );
  }

  return (
    <Box role="group" aria-label="Unit" sx={{ display: "flex", flexWrap: "wrap", gap: 1, py: 1, mb: 0.5 }}>
      {units.map((unit) => {
        const active = unit.code === selection.buProductSelection;
        return (
          <ButtonBase
            key={unit.code}
            aria-pressed={active}
            onClick={() => chooseUnit(unit.code)}
            sx={unitPillSx(active)}
          >
            {unit.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

function CustomGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: readonly string[];
  onToggle: (code: string) => void;
}) {
  const look = useMisLook();
  return (
    <Box sx={{ mt: 1.25 }} role="group" aria-label={label}>
      <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: "0.1px" }}>
        {label}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.75 }}>
        {options.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            None available.
          </Typography>
        )}
        {options.map((code) => {
          const on = selected.includes(code);
          return (
            <Chip
              key={code}
              clickable
              size="small"
              label={formatUnitLabel(code)}
              aria-pressed={on}
              variant={on ? "filled" : "outlined"}
              color={on ? "primary" : "default"}
              onClick={() => onToggle(code)}
              sx={
                look.unitPills === "pills"
                  ? { borderRadius: 999, fontWeight: 700, letterSpacing: "0.2px" }
                  : undefined
              }
            />
          );
        })}
      </Box>
    </Box>
  );
}
