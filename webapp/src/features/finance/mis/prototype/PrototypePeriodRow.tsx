// PROTOTYPE (branch prototype/mis-look) — throwaway, never merge.
//
// D4 step 1: the Period row — Annually | Quarterly | Monthly | TTM — at the top
// of the ARR Dashboard, where the source has it (`PeriodRow.js`), rather than
// inside the filter bar where the port keeps it today.
//
//   A, C  the source's SegmentedFilter: 8px-radius segments, primary border and
//         12% tint when pressed, 700 weight — never orange text
//   B     Oxygen's ToggleButtonGroup, as the port renders today

import { useNavigate } from "react-router";
import { Box, ButtonBase, ToggleButton, ToggleButtonGroup } from "@wso2/oxygen-ui";
import { MIS_BUILD_PATH_BY_PERIOD } from "@constants/misApps";
import {
  MIS_PERIOD_CHOICE_LABELS,
  MIS_PERIOD_CHOICE_ORDER,
  periodChoiceOf,
  periodChoiceTarget,
  type MisPeriodChoice,
} from "../util/misFilterBarModel";
import { MIS_WINDOWS } from "../util/misViewVocabulary";
import type { MisViewState } from "../util/useMisViewState";
import { useMisLook } from "./misLookPrototype";
import { periodSegmentSx } from "./misLookTokens";

export default function PrototypePeriodRow({ view }: { view: MisViewState }) {
  const look = useMisLook();
  const navigate = useNavigate();
  const current = periodChoiceOf(view.period, view.viewWindow);

  // Same rule as the port's bar: three Periods navigate to their bare route,
  // TTM sets a Window on the Annually route already showing.
  const choose = (choice: MisPeriodChoice) => {
    const target = periodChoiceTarget(choice);
    if (target.period === view.period) {
      view.setWindow(target.viewWindow ?? MIS_WINDOWS.CALENDAR);
      return;
    }
    navigate(MIS_BUILD_PATH_BY_PERIOD[target.period]);
  };

  if (look.periodControl === "toggle") {
    return (
      <ToggleButtonGroup
        exclusive
        size="small"
        value={current}
        aria-label="Period"
        onChange={(_, next: MisPeriodChoice | null) => next && choose(next)}
        sx={{ mb: 1.5 }}
      >
        {MIS_PERIOD_CHOICE_ORDER.map((choice) => (
          <ToggleButton key={choice} value={choice} sx={{ textTransform: "none", px: 2 }}>
            {MIS_PERIOD_CHOICE_LABELS[choice]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    );
  }

  return (
    <Box role="group" aria-label="Period" sx={{ display: "flex", flexWrap: "wrap", gap: "6px", mb: 1.5 }}>
      {MIS_PERIOD_CHOICE_ORDER.map((choice) => {
        const pressed = choice === current;
        return (
          <ButtonBase
            key={choice}
            aria-pressed={pressed}
            onClick={() => choose(choice)}
            sx={periodSegmentSx(pressed)}
          >
            {MIS_PERIOD_CHOICE_LABELS[choice]}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
