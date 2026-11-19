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

import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { Box, ButtonBase, Card, Chip, Skeleton, Tooltip, Typography, type Theme } from "@wso2/oxygen-ui";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  ClockIcon,
  LockIcon,
  PencilIcon,
} from "@wso2/oxygen-ui-icons-react";
import type { ParCycle } from "../api/types";
import { formatShortDate } from "../util/parDate";
import { daysLeft, daysLeftLabel } from "../util/parDeadline";
import { useHomeInput } from "../api/useHomeInput";
import {
  CLOSED_NOTE,
  homeSteps,
  landingStep,
  stepBanner,
  type HomeStep,
  type HomeStepKey,
  type StepBanner,
} from "../util/parHome";

// Where each step opens in Active cycle. The lead review opens once the lead has shared it.
const STEP_SEGMENT: Record<HomeStepKey, string> = {
  "self-review": "cycle/self-review",
  "360": "cycle/360",
  "lead-review": "cycle/lead-review",
  f2f: "cycle/f2f",
};

// PAR 2.0, at the top of Active cycle: where you are in the cycle, as steps that are how you move
// around it. Each step opens its part below (the lead review once it's shared). The open step is a
// folder tab joined to the banner under it, which says what that step needs and by when: the steps
// themselves carry no dates.
export default function ParCycleTracker({
  cycle,
  workEmail,
  selected,
}: {
  cycle: ParCycle;
  workEmail: string;
  /** The step whose part is open below. */
  selected?: HomeStepKey;
}) {
  const navigate = useNavigate();
  const { input, isLoading } = useHomeInput(cycle, workEmail);

  if (!input && isLoading) return <Skeleton variant="rectangular" height={170} sx={{ borderRadius: 1.5, maxWidth: 1100 }} />;
  // Without the PAR record there's nothing to track; the page says why.
  if (!input) return null;

  const steps = homeSteps(input);
  const open = selected ?? landingStep(input);
  const openIndex = steps.findIndex((s) => s.key === open);
  const go = (segment: string) => navigate(`/me/performance/${segment}`);

  return (
    <Card variant="outlined" sx={{ p: 1.5, maxWidth: 1100 }}>
      <Chip label={cycle.parCycleName} size="small" color="primary" variant="outlined" sx={{ mb: 1.5, fontWeight: 600 }} />
      <Box
        component="ol"
        aria-label="Your PAR cycle"
        sx={(theme) => ({
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 1,
          m: 0,
          mb: 1,
          p: 0,
          [theme.breakpoints.up("sm")]: {
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 0.5,
            // The open tab runs over the banner's top edge.
            mb: "-1px",
            position: "relative",
            zIndex: 1,
          },
        })}
      >
        {steps.map((step, i) => (
          <TrackerStep
            key={step.key}
            step={step}
            number={i + 1}
            selected={step.key === open}
            onOpen={step.key !== "lead-review" || step.status === "done" ? () => go(STEP_SEGMENT[step.key]) : undefined}
          />
        ))}
      </Box>
      <StepPanel banner={stepBanner(input, open)} openIndex={openIndex} stepCount={steps.length} />
    </Card>
  );
}

// The open tab and the banner share one surface, a shade off the page, and one edge. theme.palette holds the
// light scheme only; theme.vars follows the light/dark switch.
const palette = (theme: Theme) => (theme.vars ?? theme).palette;
const panelBg = (theme: Theme) =>
  `color-mix(in srgb, ${palette(theme).text.primary} 5%, ${palette(theme).background.default})`;
const panelEdge = (theme: Theme) => `color-mix(in srgb, ${palette(theme).text.primary} 14%, transparent)`;

// One step: the number, its name and whose move it is, and where it stands. Clickable all over;
// without `onOpen` it can't be opened yet, so it's greyed out. The open one is a folder tab with a
// line in the main colour along its top (on a phone, where the steps stack, an outlined box).
function TrackerStep({
  step,
  number,
  selected,
  onOpen,
}: {
  step: HomeStep;
  number: number;
  selected: boolean;
  onOpen?: () => void;
}) {
  const green = step.status === "done" || step.status === "enough";
  const yours = step.status === "todo";
  const box = (theme: Theme) => ({
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "stretch",
    justifyContent: "flex-start",
    gap: 0.5,
    textAlign: "left" as const,
    px: 1.5,
    pt: 1.5,
    pb: 1.25,
    border: 1,
    borderColor: selected ? panelEdge(theme) : "transparent",
    borderRadius: "14px",
    bgcolor: selected ? panelBg(theme) : "transparent",
    boxShadow: selected ? `inset 0 3px 0 ${palette(theme).primary.main}` : "none",
    [theme.breakpoints.up("sm")]: {
      borderRadius: "14px 14px 0 0",
      borderBottomColor: selected ? panelBg(theme) : "transparent",
    },
  });
  const content: ReactNode = (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
        <Box
          aria-hidden
          sx={{
            width: 22,
            height: 22,
            flexShrink: 0,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            // The number follows whose move it is: orange only when it's the employee's.
            bgcolor: green ? "success.main" : yours ? "primary.main" : "action.selected",
            color: green || yours ? "common.white" : "text.secondary",
          }}
        >
          {number}
        </Box>
        <Typography
          variant="body2"
          component="div"
          sx={{ flex: 1, minWidth: 0, fontWeight: 600, color: selected ? "text.primary" : "text.secondary" }}
        >
          {step.label}
        </Typography>
        <StepStatusChip step={step} />
      </Box>
      {step.detail && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ pl: "30px" }}>
          {step.detail}
        </Typography>
      )}
    </>
  );
  return (
    <Box component="li" sx={{ listStyle: "none", display: "flex" }}>
      {onOpen ? (
        <ButtonBase
          onClick={onOpen}
          aria-current={selected ? "page" : step.state === "current" ? "step" : undefined}
          sx={(theme) => ({ ...box(theme), ...(!selected && { "&:hover": { bgcolor: "action.hover" } }) })}
        >
          {content}
        </ButtonBase>
      ) : (
        <Box
          aria-current={step.state === "current" ? "step" : undefined}
          sx={(theme) => ({ ...box(theme), ...(!selected && { opacity: 0.5, cursor: "not-allowed" }) })}
        >
          {content}
        </Box>
      )}
    </Box>
  );
}

// Whose move the step is, with a colour and icon each: yours in the main colour, done in green,
// someone else's or not open yet in grey. All outlined, so the colour stays in the border.
function StepStatusChip({ step }: { step: HomeStep }) {
  const sx = { height: 20, fontSize: 11, flexShrink: 0, "& .MuiChip-icon": { ml: 0.75, mr: -0.25 } } as const;
  switch (step.status) {
    case "done":
      return <Chip size="small" color="success" variant="outlined" icon={<CheckIcon size={12} />} label="Done" sx={sx} />;
    case "enough":
      return (
        <Tooltip title={step.due ? `Enough for results. More can still come in until ${formatShortDate(step.due)}.` : ""}>
          <Chip size="small" color="success" variant="outlined" icon={<CheckIcon size={12} />} label="Minimum met" sx={sx} />
        </Tooltip>
      );
    case "todo":
      return <Chip size="small" color="primary" variant="outlined" icon={<PencilIcon size={12} />} label="To do" sx={sx} />;
    case "waiting":
      return (
        <Tooltip title={step.waitingOn ? `Waiting on ${step.waitingOn}` : ""}>
          <Chip size="small" variant="outlined" icon={<ClockIcon size={12} />} label="Waiting" sx={sx} />
        </Tooltip>
      );
    case "closed":
      return (
        <Tooltip title={CLOSED_NOTE[step.key] ?? ""}>
          <Chip
            size="small"
            variant="outlined"
            icon={<CircleMinusIcon size={12} />}
            label="Closed"
            sx={{ ...sx, color: "text.secondary" }}
          />
        </Tooltip>
      );
    case "locked":
      return <Chip size="small" variant="outlined" icon={<LockIcon size={12} />} label="Not yet" sx={{ ...sx, color: "text.secondary" }} />;
  }
}

const BANNER_ICON = {
  todo: ArrowRightIcon,
  waiting: ClockIcon,
  done: CircleCheckIcon,
  closed: CircleMinusIcon,
  locked: LockIcon,
} as const;

// The one-line banner under the steps: what happens next in the open step and, on the right, by when.
// The employee's own deadlines say how many days are left, amber in the last three; someone else's is
// just a date.
function StepPanel({ banner, openIndex, stepCount }: { banner: StepBanner; openIndex: number; stepCount: number }) {
  const tint = banner.tone === "todo" ? "primary.main" : banner.tone === "done" ? "success.main" : "text.secondary";
  const Icon = BANNER_ICON[banner.tone];
  const days = banner.due ? daysLeft(banner.due) : NaN;
  const showDays = banner.tone === "todo" && !Number.isNaN(days) && days >= 0;
  return (
    <Box
      sx={(theme) => ({
        border: 1,
        borderColor: panelEdge(theme),
        bgcolor: panelBg(theme),
        borderRadius: "14px",
        px: 2,
        py: 1.25,
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        columnGap: 1.5,
        rowGap: 1,
        // Square under the first or last tab, so the tab runs straight into the banner.
        [theme.breakpoints.up("sm")]: {
          borderTopLeftRadius: openIndex === 0 ? 0 : "14px",
          borderTopRightRadius: openIndex === stepCount - 1 ? 0 : "14px",
        },
      })}
    >
      <Box aria-hidden sx={{ color: tint, display: "flex", flexShrink: 0 }}>
        <Icon size={16} />
      </Box>
      <Typography variant="body2" sx={{ flex: "1 1 320px", minWidth: 0 }}>
        {banner.text}
      </Typography>
      {banner.due && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, color: "text.secondary" }}>
          <CalendarIcon size={16} aria-hidden />
          <Typography variant="body2">
            {banner.dueLabel ?? "Due"} {formatShortDate(banner.due)}
            {showDays && (
              <Box component="span" sx={{ fontWeight: 600, color: days <= 3 ? "warning.main" : "primary.main" }}>
                {" · "}
                {daysLeftLabel(days)}
              </Box>
            )}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
