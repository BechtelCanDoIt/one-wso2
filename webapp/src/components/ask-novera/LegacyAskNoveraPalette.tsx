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

import {
  Box,
  Dialog,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@wso2/oxygen-ui";
import { useNavigate } from "react-router";
import { PIN_KIND_META } from "@features/pinned/pinKinds";
import { usePinnedEntries } from "@features/pinned/usePinned";

/** Props for the LegacyAskNoveraPalette dialog. */
export interface LegacyAskNoveraPaletteProps {
  /** Callback to close the dialog */
  onClose: () => void;
}

/**
 * Legacy modal dialog showing pinned entries and the Coming Soon announcement.
 * Rendered when the novera preview feature flag is absent or disabled.
 */
export default function LegacyAskNoveraPalette({ onClose }: LegacyAskNoveraPaletteProps) {
  const navigate = useNavigate();
  const pinned = usePinnedEntries();

  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby="ask-novera-legacy-title"
      sx={{ "& .MuiDialog-container": { alignItems: "flex-start" } }}
      slotProps={{
        backdrop: { sx: { bgcolor: "rgba(10,10,11,.4)", backdropFilter: "blur(3px)" } },
        paper: {
          sx: {
            width: 520,
            maxWidth: "92vw",
            m: 0,
            mt: "78px",
            borderRadius: 2,
            overflow: "hidden",
          },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: "15px 18px",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, #ff9a6e)`,
            flexShrink: 0,
          }}
        />
        <Typography id="ask-novera-legacy-title" sx={{ flex: 1, fontSize: 15, fontWeight: 600 }}>
          Ask Novera
        </Typography>
        <Box
          sx={{
            fontSize: 11,
            border: 1,
            borderColor: "divider",
            borderRadius: 0.75,
            px: 0.875,
            py: 0.375,
            color: "text.secondary",
          }}
        >
          esc
        </Box>
      </Box>

      {pinned.length > 0 && (
        <Box sx={{ py: 1 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            component="h2"
            sx={{ display: "block", px: 2.25, pb: 0.5 }}
          >
            Pinned
          </Typography>
          <List disablePadding>
            {pinned.map((entry) => {
              const Icon = PIN_KIND_META[entry.kind].icon;
              return (
                <ListItemButton
                  key={`${entry.kind}-${entry.id}`}
                  onClick={() => {
                    navigate(entry.href);
                    onClose();
                  }}
                  sx={{ px: 2.25, py: 0.875 }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: 1.5 }}>
                    <Icon size={16} />
                  </ListItemIcon>
                  <ListItemText primary={entry.label} />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      )}

      <Box sx={{ p: "28px 22px", textAlign: "center" }}>
        <Typography sx={{ fontWeight: 600, mb: 0.75 }}>Coming soon</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: "auto" }}>
          Hi! I&apos;m Novera, WSO2&apos;s internal AI agent. Soon you&apos;ll be able to ask me
          things and get answers.
        </Typography>
      </Box>
    </Dialog>
  );
}
