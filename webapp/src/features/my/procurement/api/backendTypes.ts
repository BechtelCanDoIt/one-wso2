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

// The wire shapes of the backend behind ONE_WSO2_PROCUREMENT_BACKEND_URL, as its API
// specification defines them. Only the parts the UI reads are listed. Nothing outside
// api/ should use these: the mapping in backendMapping.ts turns them into the UI's own types.

export type BackendCategory = "MARKETING_EVENTS" | "NON_IT" | "IT";

export type BackendStatus = "CANCELLED" | "ASSIGNED" | "REJECTED" | "APPROVED" | "PENDING_APPROVAL" | "DRAFT";

export interface BackendUser {
  email: string;
  roles: string[];
}

export interface BackendDirectoryUser {
  email: string;
  name: string;
}

export interface BackendTeamLeadResult {
  approvalExempt: boolean;
  teamLead?: BackendDirectoryUser | null;
}

export interface BackendReferenceItem {
  code: string;
  label: string;
}

export interface BackendBudgetApprover {
  id: number;
  name: string;
}

export interface BackendEngagementOption {
  code: string;
  name: string;
}

export interface BackendRequestSummary {
  id: number;
  referenceNo: string | null;
  title: string;
  category: BackendCategory;
  status: BackendStatus;
  version: number;
  submittedOn: string | null;
  updatedOn: string;
}

export interface BackendDecision {
  version: number;
  decidedBy: string;
  decision: "REJECTED" | "APPROVED";
  isOverride: boolean;
  comment: string | null;
  justification: string | null;
  decidedOn: string;
}

export interface BackendItDetails {
  softwareName: string;
}

export interface BackendSaasDetails {
  adminCount: number;
  adminDetails: string;
  userCount: number;
  userDetails: string;
  handlesSensitiveData?: boolean;
  sensitiveDataDetails?: string | null;
  handlesExternalPii?: boolean;
  externalPiiDetails?: string | null;
  handlesEmployeePii?: boolean;
  employeePiiDetails?: string | null;
  integratesInternalSystems?: boolean;
  integrationDetails?: string | null;
  vendorDocsLinks?: string | null;
}

export interface BackendRequestDetail extends BackendRequestSummary {
  requesterName: string;
  requesterEmail: string;
  requirementDetails: string;
  vendorName: string | null;
  budgetCategoryCode: string | null;
  businessUnitCode: string | null;
  productCode: string | null;
  regionCode: string | null;
  engagementCode: string | null;
  budgetApproverId: number | null;
  budgetApproverName: string | null;
  teamLeadEmail: string | null;
  additionalApprovers: string[];
  itDetails: BackendItDetails | null;
  saasDetails: BackendSaasDetails | null;
  decisions: BackendDecision[];
  createdOn: string;
}
