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
import { Alert, Box, Typography } from "@wso2/oxygen-ui";
import { isProcurementAvailable } from "../api/procurementApi";

// Page frame for Procurement: the title, and the "not connected" state.
export default function ProcurementShell({
  title = "Procurement",
  subtitle = "Raise purchase requests and follow them through approval to Procurement.",
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Box>
      <Typography component="h1" variant="h5" sx={{ mb: 0.5, fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25, maxWidth: "70ch" }}>
        {subtitle}
      </Typography>
      {isProcurementAvailable() ? (
        children
      ) : (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          Procurement isn't connected yet. Set <code>ONE_WSO2_PROCUREMENT_BACKEND_URL</code> in{" "}
          <code>public/config.js</code> (the backend URL) and reload.
        </Alert>
      )}
    </Box>
  );
}
