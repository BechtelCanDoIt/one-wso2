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

import { Alert, alpha, Box, Button, Link, Paper, Stack, Typography, type Theme } from "@wso2/oxygen-ui";

const PROCUREMENT_EMAIL = "procurement@wso2.com";

// Shown in place of the form once a request has been submitted.
export default function RequestSubmitted({
  reference,
  onSubmitAnother,
  onClose,
}: {
  reference: string;
  onSubmitAnother: () => void;
  onClose: () => void;
}) {
  return (
    <Stack spacing={3} alignItems="center" sx={{ textAlign: "center", py: 4 }}>
      <Box
        aria-hidden
        sx={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          // A tint of the theme's primary colour, so it follows the active theme.
          bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.18),
          // Motion only for people who have not asked for less of it.
          "@media (prefers-reduced-motion: no-preference)": {
            animation: "tickPulse 2.4s ease-in-out infinite",
            "& .tick-path": { strokeDasharray: 40, strokeDashoffset: 40, animation: "tickDraw 0.7s 0.2s ease-out forwards" },
          },
          "@keyframes tickPulse": {
            "0%, 100%": { transform: "scale(1)", opacity: 1 },
            "50%": { transform: "scale(1.08)", opacity: 0.6 },
          },
          "@keyframes tickDraw": { to: { strokeDashoffset: 0 } },
        }}
      >
        <Box
          sx={{
            width: 68,
            height: 68,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: "background.paper",
            border: 2,
            borderColor: "primary.main",
            color: "primary.main",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path
              className="tick-path"
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Box>
      </Box>
      <Typography variant="h4" component="h2">
        Requisition submitted successfully
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: "60ch" }}>
        Your request has been sent to the Procurement Team. You will receive a confirmation and be kept updated at
        every step of the process.
      </Typography>
      <Paper variant="outlined" sx={{ px: 4, py: 2 }}>
        <Typography component="span" color="text.secondary">
          Your reference number:{" "}
        </Typography>
        <Typography component="span" sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1.25rem", color: "primary.main" }}>
          {reference}
        </Typography>
      </Paper>
      <Alert severity="warning" sx={{ textAlign: "left", maxWidth: 720 }}>
        Do not contact the vendor or make any commitments until the Procurement Team issues a Purchase Order. Questions?
        Email <Link href={`mailto:${PROCUREMENT_EMAIL}`}>{PROCUREMENT_EMAIL}</Link>
      </Alert>
      <Stack direction="row" spacing={2}>
        <Button variant="outlined" color="inherit" onClick={onSubmitAnother}>
          Submit another request
        </Button>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </Stack>
    </Stack>
  );
}
