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

import type { JSX, ReactNode } from "react";
import { Box, Typography } from "@wso2/oxygen-ui";

/** A titled part of a widget: a small heading and its content, with no card of its own (the widget is the card). */
export function Block({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }): JSX.Element {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1.25 }}>
        <Typography component="h3" sx={{ fontSize: 14, fontWeight: 600, flex: 1 }}>
          {title}
        </Typography>
        {aside}
      </Box>
      {children}
    </Box>
  );
}
