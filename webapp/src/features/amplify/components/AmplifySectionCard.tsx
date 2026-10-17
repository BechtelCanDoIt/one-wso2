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
import { Box, Card, CardContent, Stack, Typography } from "@wso2/oxygen-ui";

/**
 * A titled panel. Every Amplify screen is a handful of these, so the heading
 * size and spacing are decided once rather than per page.
 */
export default function AmplifySectionCard({
  title,
  caption,
  action,
  children,
  sx,
}: {
  title?: string;
  caption?: string;
  action?: ReactNode;
  children: ReactNode;
  sx?: object;
}) {
  return (
    <Card variant="outlined" sx={{ mb: 2.5, ...sx }}>
      <CardContent>
        {(title || action) && (
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", rowGap: 1 }}
          >
            <Box>
              {title && (
                <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {title}
                </Typography>
              )}
              {caption && (
                <Typography variant="caption" color="text.secondary">
                  {caption}
                </Typography>
              )}
            </Box>
            {action && <Box>{action}</Box>}
          </Stack>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
