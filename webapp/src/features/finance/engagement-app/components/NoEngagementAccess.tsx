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

import type { JSX } from "react";
import { Link as RouterLink } from "react-router";
import { Box, Link, Stack, Typography } from "@wso2/oxygen-ui";
import { BriefcaseBusinessIcon } from "@wso2/oxygen-ui-icons-react";
import { NothingHere, PageTitle } from "@components/perspective-landing/PerspectiveLanding";
import { myEngagementPaths } from "../engagementPaths";
import type { EngagementAccess } from "../model/engagementAccess";

/**
 * What someone sees at any Finance-side Engagement App address when they have
 * nothing there. Said plainly, rather than redirecting them: a person who
 * followed a link believing they had access would otherwise land on another
 * page with no explanation.
 */
export default function NoEngagementAccess({
  access,
  accessRequestEmail,
}: {
  access: EngagementAccess;
  /** Where to ask for access; the line is left out when empty. */
  accessRequestEmail?: string;
}): JSX.Element {
  const email = accessRequestEmail?.trim();
  const meLinks = [
    ...(access.myAllocations ? [{ label: "Allocations", to: myEngagementPaths.allocations }] : []),
    ...(access.myTravelRequests ? [{ label: "Travels", to: myEngagementPaths.travelRequests }] : []),
  ];
  return (
    <Box>
      <PageTitle label="Engagement App" />
      <NothingHere
        label="Engagement App"
        icon={BriefcaseBusinessIcon}
        heading="You don't have access to the Engagement App"
      >
        {meLinks.length > 0 && (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap", alignItems: "baseline", mb: email ? 1 : 0 }}
          >
            <Typography variant="body2" color="text.secondary">
              Your own allocations and travels are under Me.
            </Typography>
            {meLinks.map((l) => (
              <Link key={l.to} component={RouterLink} to={l.to} variant="body2">
                {l.label}
              </Link>
            ))}
          </Stack>
        )}
        {email && (
          <Typography variant="body2" color="text.secondary">
            If you think you need access, email <Link href={`mailto:${email}`}>{email}</Link>.
          </Typography>
        )}
      </NothingHere>
    </Box>
  );
}
