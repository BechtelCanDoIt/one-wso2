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

import { Box, Button, Card, Chip, Stack, Typography } from "@wso2/oxygen-ui";
import { MegaphoneIcon } from "@wso2/oxygen-ui-icons-react";
import { useNavigate } from "react-router";
import { isPreviewEnabled } from "@config/previewFeatures";
import { isAmplifyBackendConfigured } from "@config/apiConfig";
import { AMPLIFY_PATHS } from "@constants/amplifyApps";
import { useAmplifyCampaigns } from "../api/amplifyHooks";
import { useAmplifyDependencyNotice } from "./AmplifyShell";
import { amplifyBtnSx, relativeTime } from "./amplifyUi";

/**
 * The slim Amplify row on the Me landing. Phase 1 is one compact line: the
 * newest priority campaign if there is one, otherwise nothing at all — Me is
 * the profile page, and an empty Amplify row there would be noise. The whole
 * thing is absent when the module's preview flag is off or the backend isn't
 * configured, so it costs a deployment with no Amplify exactly nothing.
 */
export default function AmplifyOverviewBar() {
  const enabled = isPreviewEnabled("amplify") && isAmplifyBackendConfigured();
  const navigate = useNavigate();
  const query = useAmplifyCampaigns({ status: "open", size: 10 });

  useAmplifyDependencyNotice(
    enabled && query.isError,
    "Amplify is having trouble right now — the latest campaigns couldn't be loaded.",
  );

  if (!enabled) return null;

  const items = query.data?.items ?? [];
  const featured = items.find((c) => c.isPriority) ?? items[0];
  if (!featured) return null;

  return (
    <Card variant="outlined" sx={{ mb: 2.5 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", p: 1.75, flexWrap: "wrap", rowGap: 1 }}>
        <MegaphoneIcon size={18} />
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {featured.title}
            </Typography>
            {featured.isPriority && <Chip size="small" color="warning" label="Priority" />}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Closes {relativeTime(featured.closesAt)}
          </Typography>
        </Box>
        <Button size="small" variant="contained" onClick={() => navigate(AMPLIFY_PATHS.posts)} sx={amplifyBtnSx}>
          Amplify
        </Button>
      </Stack>
    </Card>
  );
}
