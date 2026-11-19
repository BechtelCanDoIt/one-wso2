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

import type { ComponentType, ReactNode } from "react";
import { Box, Typography } from "@wso2/oxygen-ui";

// A step in Active cycle with nothing to do yet: an icon beside what it waits for, in a shaded box.
export default function ParStepNote({ icon: Icon, children }: { icon: ComponentType<{ size?: number }>; children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.75,
        px: 2.5,
        py: 2.25,
        borderRadius: "12px",
        bgcolor: "action.hover",
      }}
    >
      <Box aria-hidden sx={{ display: "flex", flexShrink: 0, color: "text.secondary" }}>
        <Icon size={22} />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Box>
  );
}
