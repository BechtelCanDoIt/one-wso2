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
import { Link } from "@wso2/oxygen-ui";
import { engagementPaths } from "../engagementPaths";

/** A job number that opens its travel request, without also opening the row it sits in. */
export default function JobLink({ job, to = engagementPaths.travelRequest }: { job: string; to?: (job: string) => string }): JSX.Element {
  return (
    <Link
      component={RouterLink}
      to={to(job)}
      onClick={(e) => e.stopPropagation()}
      sx={{ fontFamily: "monospace", fontSize: 12.5, whiteSpace: "nowrap" }}
    >
      {job}
    </Link>
  );
}
