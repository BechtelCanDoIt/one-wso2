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
import { Link, Typography } from "@wso2/oxygen-ui";
import { Link as RouterLink } from "react-router";
import type { JSX, ReactNode } from "react";
import { fullName } from "../../api/derive";
import type { ReportingLine } from "../../api/types";

// Why someone is in the viewer's team, when the list alone can't say.
//
// The list marks only the people the viewer is an additional manager of. Their
// own reports are in the team too, and nothing on their rows says why — so the
// record says it, naming the additional report they came through.
//
// Direct and ordinary indirect reports need no explanation. Nor does a missing
// answer: while loading, on failure, or against a backend without the endpoint,
// this renders nothing and the record stands on its own.
export default function ReportingLineNote({
  line,
}: {
  line: ReportingLine | undefined;
}): JSX.Element | null {
  if (line?.relation === "ADDITIONAL") {
    return <Note>You&apos;re their additional manager.</Note>;
  }
  if (line?.relation === "INDIRECT" && line.through) {
    const { through } = line;
    return (
      <Note>
        In your team through{" "}
        <Link component={RouterLink} to={`/me/my-team/${encodeURIComponent(through.employeeId)}`}>
          {fullName(through)}
        </Link>
        , whom you&apos;re an additional manager of.
      </Note>
    );
  }
  return null;
}

function Note({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
      {children}
    </Typography>
  );
}
