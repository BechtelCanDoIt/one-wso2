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

// Every Procurement route, as one fragment for App.tsx, which mounts it only
// while the `procurement` preview flag is on.

import { Navigate, Route } from "react-router";
import MyRequestsPage from "./pages/MyRequestsPage";
import ProcurementGroupPage from "./pages/ProcurementGroupPage";
import NewRequestPage from "./pages/NewRequestPage";
import RequestDetailPage from "./pages/RequestDetailPage";
import { PROCUREMENT_PATH, procurementPaths } from "./procurementPaths";

// No role guard: phase 1 screens are open to every employee, and the backend
// scopes each request to its requester. The approval and assignment screens
// are gated at their route when they land.
export const procurementRoutes = (
  <Route path={PROCUREMENT_PATH.replace(/^\//, "")} element={<ProcurementGroupPage />}>
    <Route index element={<Navigate to={procurementPaths.newRequest} replace />} />
    <Route path="requests" element={<MyRequestsPage />} />
    <Route path="new" element={<NewRequestPage />} />
    <Route path="requests/:requestId" element={<RequestDetailPage />} />
    <Route path="*" element={<Navigate to={procurementPaths.newRequest} replace />} />
  </Route>
);
