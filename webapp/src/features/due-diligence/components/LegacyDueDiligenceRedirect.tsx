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
import { Navigate, useLocation } from "react-router";

/**
 * Sends an old /due-diligence/* address to the same page under /legal, keeping
 * the rest of the path, the query (the file viewer's ?fileName=…) and the
 * navigation state, so bookmarks and links sent before the move still work.
 */
export default function LegacyDueDiligenceRedirect(): JSX.Element {
  const { pathname, search, hash, state } = useLocation();
  return <Navigate to={`/legal${pathname}${search}${hash}`} state={state} replace />;
}
