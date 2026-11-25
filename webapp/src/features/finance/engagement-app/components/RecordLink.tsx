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
import { Link as RouterLink } from "react-router";
import { Link } from "@wso2/oxygen-ui";
import { BriefcaseIcon, PlaneIcon } from "@wso2/oxygen-ui-icons-react";

const ICONS = { travel: PlaneIcon, engagement: BriefcaseIcon } as const;

/** An ID that opens its record (a travel or an engagement): the record's icon, then the ID, underlined only on hover. It does not also open the row it sits in. */
export default function RecordLink({ to, kind, children }: { to: string; kind: keyof typeof ICONS; children: ReactNode }): JSX.Element {
  const Icon = ICONS[kind];
  return (
    <Link
      component={RouterLink}
      to={to}
      color="primary"
      underline="hover"
      onClick={(e) => e.stopPropagation()}
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontFamily: "monospace", fontSize: 12.5, whiteSpace: "nowrap" }}
    >
      <Icon size={13} aria-hidden />
      {children}
    </Link>
  );
}
