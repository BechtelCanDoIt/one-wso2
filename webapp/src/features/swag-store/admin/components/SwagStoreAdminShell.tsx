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
import { Outlet } from "react-router";
import { Alert, Box } from "@wso2/oxygen-ui";
import { PageTitle } from "@components/perspective-landing/PerspectiveLanding";
import { swagStoreAccess } from "../../api/swagStoreAccess";
import { useSwagStoreUserInfo } from "../../api/useSwagStoreUserInfo";

const NAME = "Swag Store";

/**
 * The frame every admin route renders in. It sits inside SwagStoreShell, which
 * has already resolved access (configured, checked, inside WSO2), so it adds
 * only the store-role step:
 *
 *   no store role  -> says the screens are for the store team, and who grants access.
 *   store admin    -> the page. Each leaf checks its own role (SwagStoreAdminRequires).
 */
export default function SwagStoreAdminShell(): JSX.Element {
  const me = useSwagStoreUserInfo();

  if (!swagStoreAccess(me.data).isAdmin) {
    return (
      <Box>
        <PageTitle label={NAME} />
        <Alert severity="info" sx={{ mt: 1.5, maxWidth: 620 }}>
          These screens are for the Swag Store team: catalog managers and fulfilment ops. People Ops grants access.
        </Alert>
      </Box>
    );
  }

  return <Outlet />;
}
