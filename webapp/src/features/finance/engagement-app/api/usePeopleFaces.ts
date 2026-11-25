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

import { useMemo } from "react";
import { useEmployeeDirectory } from "@features/org-chart/api/useOrgChart";

/** What the people directory knows about a work email. */
export interface PersonFace {
  readonly firstName?: string;
  readonly fullName?: string;
  readonly photo?: string;
}

/**
 * Photo and names by work email, from the people directory One WSO2 already loads (cached for every app).
 * Returns nothing for an email while the directory loads, when it fails, or for someone not in it.
 */
export function usePeopleFaces(): (email: string) => PersonFace {
  const directory = useEmployeeDirectory();
  const byEmail = useMemo(() => {
    const m = new Map<string, PersonFace>();
    for (const r of directory.data ?? []) {
      const email = r.workEmail?.trim().toLowerCase();
      if (!email) continue;
      const fullName = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || undefined;
      m.set(email, { firstName: r.firstName?.trim() || undefined, fullName, photo: r.employeeThumbnail ?? undefined });
    }
    return m;
  }, [directory.data]);
  return (email) => byEmail.get(email.trim().toLowerCase()) ?? {};
}
