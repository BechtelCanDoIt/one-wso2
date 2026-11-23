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

import { useId, useRef, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { alpha, Box, ButtonBase, Stack, Typography, type Theme } from "@wso2/oxygen-ui";
import { Building2Icon, LaptopIcon, MegaphoneIcon } from "@wso2/oxygen-ui-icons-react";
import type { ProcurementCategory } from "../types";
import { useFieldError } from "./fieldErrors";
import { StepTitle } from "./formFields";

const CATEGORIES: { value: ProcurementCategory; title: string; description: string; icon: ReactNode }[] = [
  {
    value: "IT",
    title: "IT Related Procurement",
    description: "Software, SaaS subscriptions, cloud infrastructure, hardware, and other technology purchases.",
    icon: <LaptopIcon size={28} />,
  },
  {
    value: "NON-IT",
    title: "Non-IT Related Procurement",
    description: "Facilities, insurance, office goods, consumables, and general professional services.",
    icon: <Building2Icon size={28} />,
  },
  {
    value: "EVENTS",
    title: "Marketing & Events Procurement",
    description: "Conferences, sponsorships, venues, AV production, and vendor services for WSO2 events and campaigns.",
    icon: <MegaphoneIcon size={28} />,
  },
];

function CategoryCard({
  icon,
  title,
  description,
  selected,
  tabIndex,
  buttonRef,
  onSelect,
  onKeyDown,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  tabIndex: number;
  buttonRef: Ref<HTMLButtonElement>;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}) {
  return (
    <ButtonBase
      ref={buttonRef}
      role="radio"
      aria-checked={selected}
      tabIndex={tabIndex}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        gap: 2,
        height: "100%",
        textAlign: "left",
        p: 3,
        border: 1,
        borderRadius: 1.5,
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: (theme: Theme) => (selected ? alpha(theme.palette.primary.main, 0.06) : "transparent"),
        transition: "border-color 0.15s, background-color 0.15s",
        "&:hover": { borderColor: selected ? "primary.main" : "text.secondary" },
        "&.Mui-focusVisible": { outline: 2, outlineStyle: "solid", outlineColor: "primary.main", outlineOffset: 2 },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: 2,
          borderColor: selected ? "primary.main" : "divider",
          display: "grid",
          placeItems: "center",
          "&::after": selected ? { content: '""', width: 10, height: 10, borderRadius: "50%", bgcolor: "primary.main" } : {},
        }}
      />
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.12),
          color: "primary.main",
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
    </ButtonBase>
  );
}

// Step 2. The category decides which questions the next step asks.
export default function CategoryStep({
  category,
  onChange,
}: {
  category: ProcurementCategory | "";
  onChange: (category: ProcurementCategory) => void;
}) {
  const error = useFieldError("category");
  const errorId = useId();
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  // Only one card is a tab stop, as in any radio group: the chosen one, or the first while none is chosen.
  const stop = Math.max(0, CATEGORIES.findIndex((c) => c.value === category));
  const move = (from: number, step: number) => {
    const next = (from + step + CATEGORIES.length) % CATEGORIES.length;
    onChange(CATEGORIES[next].value);
    cards.current[next]?.focus();
  };
  const arrowKeys = (index: number) => (event: KeyboardEvent<HTMLElement>) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    move(index, step);
  };
  return (
    <Stack spacing={3.5} sx={{ py: 1 }} data-field-error={error ? "true" : undefined}>
      <StepTitle>Procurement category</StepTitle>
      <Box
        role="radiogroup"
        aria-label="Procurement category"
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
        {CATEGORIES.map((c, index) => (
          <CategoryCard
            key={c.value}
            tabIndex={index === stop ? 0 : -1}
            buttonRef={(element) => {
              cards.current[index] = element;
            }}
            onKeyDown={arrowKeys(index)}
            icon={c.icon}
            title={c.title}
            description={c.description}
            selected={category === c.value}
            onSelect={() => onChange(c.value)}
          />
        ))}
      </Box>
      {error && (
        <Typography id={errorId} role="alert" variant="body2" color="error">
          {error}
        </Typography>
      )}
    </Stack>
  );
}
