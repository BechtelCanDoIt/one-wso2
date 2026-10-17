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

import { Alert, Box, Typography } from "@wso2/oxygen-ui";
import AmplifyShell from "../components/AmplifyShell";

/**
 * Reports — Phase 2, deliberately hidden from the rail (its registry item
 * carries no path) and reachable only by URL. This page is the honest answer
 * for someone who types the address: it exists, it is planned, it is not here.
 */
export default function AmplifyReportsPage() {
  return (
    <AmplifyShell
      title="Reports"
      subtitle="Adoption and engagement reporting for leadership."
      requireRole="slt"
    >
      {() => (
        <Box>
          <Alert severity="info">
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Coming in Phase 2
            </Typography>
            Reporting — adoption, engagement over time, and per-team breakdowns —
            is planned for the next phase. It isn't built yet, and isn't shown in
            the rail until it is.
          </Alert>
        </Box>
      )}
    </AmplifyShell>
  );
}
