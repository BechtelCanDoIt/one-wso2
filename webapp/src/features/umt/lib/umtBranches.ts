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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import type { UmtBranchCreationRequest, UmtUpdateBranch } from "../api/umtUpdates";

const UMT_BRANCH_SETTLED_STATUSES = new Set(["Completed", "Failed", "Not created"]);

export function isUmtBranchInProgress(branch: UmtUpdateBranch): boolean {
  return !UMT_BRANCH_SETTLED_STATUSES.has(branch.status ?? "");
}

// A component branch of a mono repo is cut from one directory of it, so the
// directory has to be named.
export function umtComponentDirPathError(isMonoRepo: boolean, componentDirPath: string): string | undefined {
  if (isMonoRepo && !componentDirPath.trim()) return "Component Directory Path is required";
  return undefined;
}

// The mono repo part of a branch request: nothing for a repository that holds
// one component.
export function umtMonoRepoFields(
  isMonoRepo: boolean,
  componentDirPath: string,
): Pick<UmtBranchCreationRequest, "isMonoRepo" | "componentDirPath"> {
  return isMonoRepo ? { isMonoRepo: true, componentDirPath: componentDirPath.trim() } : {};
}
