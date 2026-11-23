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
import { alpha, Box, ButtonBase, Stack, Typography, type Theme } from "@wso2/oxygen-ui";
import { Building2Icon, LaptopIcon, MegaphoneIcon } from "@wso2/oxygen-ui-icons-react";
import type { ProcurementCategory } from "../types";
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
  onSelect,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <ButtonBase
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
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
  return (
    <Stack spacing={3.5} sx={{ py: 1 }}>
      <StepTitle>Procurement category</StepTitle>
      <Box role="radiogroup" aria-label="Procurement category" sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
        {CATEGORIES.map((c) => (
          <CategoryCard
            key={c.value}
            icon={c.icon}
            title={c.title}
            description={c.description}
            selected={category === c.value}
            onSelect={() => onChange(c.value)}
          />
        ))}
      </Box>
    </Stack>
  );
}
