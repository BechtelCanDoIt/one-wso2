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
import { Box, ButtonBase, Card, Chip, Skeleton, Stack, Typography, type Theme } from "@wso2/oxygen-ui";
import { CalendarIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import type { ParCycle } from "../api/types";
import { formatShortDate } from "../util/parDate";
import { daysLeft, daysLeftLabel } from "../util/parDeadline";
import { useHomeInput } from "../api/useHomeInput";
import {
  STEP_STATE_LABEL,
  homeSteps,
  landingStep,
  stepHeader,
  type HomeStep,
  type HomeStepKey,
  type StepHeader,
  type StepState,
} from "../util/parHome";

// Where each step opens in Active cycle.
const STEP_SEGMENT: Record<HomeStepKey, string> = {
  "self-review": "cycle/self-review",
  "360": "cycle/360",
  "lead-review": "cycle/lead-review",
  f2f: "cycle/f2f",
};

// The state word's colour; the step's number and name look the same in every state.
const STATE_COLOR: Record<StepState, string> = {
  "not-started": "primary.main",
  "in-progress": "info.main",
  "not-available": "text.secondary",
  done: "success.main",
  incomplete: "error.main",
};

// PAR 2.0, Active cycle: the four steps as tabs, each with its state, and under them the open step's
// panel, which `children` fills. The panel starts with the step's heading and, on its right, its date;
// an Incomplete step has one line under the heading instead of a date. Every tab opens: a step with
// nothing to do yet says so in its panel.
export default function ParCycleTracker({
  cycle,
  workEmail,
  selected,
  children,
}: {
  cycle: ParCycle;
  workEmail: string;
  /** The step whose panel is open. */
  selected?: HomeStepKey;
  /** The open step's page. */
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  const { input, isLoading, failed } = useHomeInput(cycle, workEmail);

  if (!input && isLoading) return <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 1.5, maxWidth: 1100 }} />;
  // Without the PAR record there's nothing to track; the page says why.
  if (!input) return <>{children}</>;
  // Without how many responded the steps can't be told, so none are shown; the step's own page still works.
  if (failed) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 1100 }}>
        <ErrorNotice error={failed.error} onRetry={failed.retry} retrying={failed.retrying}>
          Couldn't load your PAR cycle's progress.
        </ErrorNotice>
        {children}
      </Stack>
    );
  }

  const steps = homeSteps(input);
  const open = selected ?? landingStep(input);

  return (
    <Card variant="outlined" sx={{ maxWidth: 1100 }}>
      <Box sx={(theme) => ({ bgcolor: railBg(theme), px: 1.5, pt: 1.5 })}>
        <Chip label={cycle.parCycleName} size="small" color="primary" variant="outlined" sx={{ mb: 1.5, fontWeight: 600 }} />
        <Box
          component="ol"
          aria-label="Your PAR cycle"
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(150px, 1fr))",
            gap: 0.5,
            m: 0,
            p: 0,
            // On a phone the tabs scroll sideways in one row.
            overflowX: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {steps.map((step, i) => (
            <TrackerStep
              key={step.key}
              step={step}
              number={i + 1}
              selected={step.key === open}
              onOpen={() => navigate(`/me/performance/${STEP_SEGMENT[step.key]}`)}
            />
          ))}
        </Box>
      </Box>
      {/* The panel has the open tab's layers, the rail's shade and then the paper colour, so the two are one
          colour even where the theme's surfaces are see-through. */}
      <Box sx={(theme) => ({ bgcolor: railBg(theme), borderTop: 1, borderColor: line(theme) })}>
        <Box sx={{ bgcolor: "background.paper", px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: 3 }}>
          <PanelHeader header={stepHeader(input, open)} />
          {children}
        </Box>
      </Box>
    </Card>
  );
}

// The tab rail is a shade off the card, and the open tab and its panel are the card itself. theme.palette
// holds the light scheme only; theme.vars follows the light/dark switch.
const palette = (theme: Theme) => (theme.vars ?? theme).palette;
const railBg = (theme: Theme) => `color-mix(in srgb, ${palette(theme).text.primary} 5%, ${palette(theme).background.paper})`;
// The line under the tabs, and round the open one: as strong as the mock's, whatever the theme's divider (a faint
// 7% in Choreo Labs).
const line = (theme: Theme) => `color-mix(in srgb, ${palette(theme).text.primary} 20%, transparent)`;

// One tab: the step's number and name, and under the name its state, after a dot in its colour. The
// open one has the panel's colour, edges, and a line in the main colour along its top.
function TrackerStep({
  step,
  number,
  selected,
  onOpen,
}: {
  step: HomeStep;
  number: number;
  selected: boolean;
  onOpen: () => void;
}) {
  return (
    <Box component="li" sx={{ listStyle: "none", display: "flex" }}>
      <ButtonBase
        onClick={onOpen}
        aria-current={selected ? "page" : undefined}
        sx={(theme) => ({
          flex: 1,
          display: "grid",
          gridTemplateColumns: "auto minmax(0, 1fr)",
          columnGap: 1.25,
          alignItems: "center",
          justifyContent: "stretch",
          textAlign: "left",
          px: 1.5,
          pt: 1.5,
          pb: 1.25,
          borderRadius: "12px 12px 0 0",
          border: 1,
          // The line under the tabs runs under the open one too, as in the mock.
          borderBottom: 0,
          borderColor: selected ? line(theme) : "transparent",
          bgcolor: selected ? "background.paper" : "transparent",
          boxShadow: selected ? `inset 0 3px 0 ${palette(theme).primary.main}` : "none",
          ...(!selected && { "&:hover": { bgcolor: "action.hover" } }),
        })}
      >
        <Box
          aria-hidden
          sx={{
            gridRow: "1 / span 2",
            width: 26,
            height: 26,
            borderRadius: "50%",
            border: "1.5px solid",
            borderColor: "text.disabled",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 600,
            color: "text.primary",
          }}
        >
          {number}
        </Box>
        <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
          {step.label}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {/* A dot in the state's colour before the state word. */}
          <Box
            aria-hidden
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              flexShrink: 0,
              bgcolor: step.state === "not-available" ? "text.disabled" : STATE_COLOR[step.state],
            }}
          />
          <Typography
            variant="caption"
            component="div"
            sx={{ fontWeight: step.state === "not-available" ? 500 : 600, color: STATE_COLOR[step.state] }}
          >
            {STEP_STATE_LABEL[step.state]}
          </Typography>
        </Box>
      </ButtonBase>
    </Box>
  );
}

// The top of the open step's panel: its heading and, on the right, its date with the days left while
// it's the employee's to do; or, for an Incomplete step, one line under the heading.
function PanelHeader({ header }: { header: StepHeader }) {
  const days = header.due ? daysLeft(header.due.date) : NaN;
  const showDays = Boolean(header.due?.countdown) && !Number.isNaN(days) && days >= 0;
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        columnGap: 3,
        rowGap: 1,
        mb: 2.5,
      }}
    >
      <Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          {header.title}
        </Typography>
        {header.line && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {header.line}
          </Typography>
        )}
      </Box>
      {header.due && (
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            flexShrink: 0,
            px: 1.5,
            py: 0.75,
            border: 1,
            borderColor: "divider",
            borderRadius: 999,
            color: "text.secondary",
          }}
        >
          <CalendarIcon size={16} aria-hidden />
          <Typography variant="body2">
            {header.due.label} {formatShortDate(header.due.date)}
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
