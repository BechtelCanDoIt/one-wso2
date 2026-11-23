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
import { alpha, Box, Card, CardActionArea, CardContent, Chip, Stack, Typography, type Theme } from "@wso2/oxygen-ui";
import { Building2Icon, CircleCheckIcon, LaptopIcon, MegaphoneIcon } from "@wso2/oxygen-ui-icons-react";
import type { ProcurementCategory } from "../types";
import { StepTitle } from "./formFields";

const CATEGORIES: { value: ProcurementCategory; title: string; description: string; icon: ReactNode }[] = [
  {
    value: "IT",
    title: "IT Related Procurement",
    description: "Software, SaaS subscriptions, cloud infrastructure, hardware, and other technology purchases.",
    icon: <LaptopIcon size={24} />,
  },
  {
    value: "NON-IT",
    title: "Non-IT Related Procurement",
    description: "Facilities, insurance, office goods, consumables, and general professional services.",
    icon: <Building2Icon size={24} />,
  },
  {
    value: "EVENTS",
    title: "Marketing & Events Procurement",
    description: "Conferences, sponsorships, venues, AV production, and vendor services for WSO2 events and campaigns.",
    icon: <MegaphoneIcon size={24} />,
  },
];

function CategoryCard({
  icon,
  title,
  description,
  selected = false,
  disabled = false,
  onSelect,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  const body = (
    <CardContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            // Tinted from the theme's own primary colour so it follows the active theme.
            bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.12),
            color: "primary.main",
          }}
        >
          {icon}
        </Box>
        {selected && (
          <Box sx={{ color: "primary.main", display: "flex" }}>
            <CircleCheckIcon size={22} aria-hidden />
          </Box>
        )}
        {disabled && <Chip size="small" label="Coming soon" />}
      </Stack>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
    </CardContent>
  );

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? "primary.main" : "divider",
        boxShadow: selected ? (theme: Theme) => `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}` : "none",
        opacity: disabled ? 0.6 : 1,
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {disabled ? (
        body
      ) : (
        <CardActionArea onClick={onSelect} aria-pressed={selected} sx={{ height: "100%" }}>
          {body}
        </CardActionArea>
      )}
    </Card>
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
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
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
