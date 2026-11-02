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

import { describe, expect, it } from "vitest";
import {
  QUEUE_TAB_ALL_PENDING,
  QUEUE_TAB_AWAITING,
  QUEUE_TAB_COMPLETED,
  QUEUE_TAB_DUE_SOON,
  QUEUE_TAB_OVERDUE,
  QUEUE_TAB_PENDING,
  QUEUE_TAB_VALIDATION,
  isQueueTabVisible,
  type QueueAccess,
} from "./workQueueTabs";

const NONE: QueueAccess = {
  canViewAll: false,
  canApprove: false,
  canSubmit: false,
  canValidate: false,
};

const ALL_TABS = [
  QUEUE_TAB_AWAITING,
  QUEUE_TAB_DUE_SOON,
  QUEUE_TAB_PENDING,
  QUEUE_TAB_VALIDATION,
  QUEUE_TAB_OVERDUE,
  QUEUE_TAB_ALL_PENDING,
  QUEUE_TAB_COMPLETED,
];

const UNGATED_TABS = [
  QUEUE_TAB_DUE_SOON,
  QUEUE_TAB_OVERDUE,
  QUEUE_TAB_ALL_PENDING,
  QUEUE_TAB_COMPLETED,
];

const visible = (access: QueueAccess) =>
  ALL_TABS.filter((t) => isQueueTabVisible(t, access));

describe("isQueueTabVisible", () => {
  it("shows every tab to canViewAll, even without the other flags", () => {
    expect(visible({ ...NONE, canViewAll: true })).toEqual(ALL_TABS);
  });

  it("shows only the status and date tabs when no privilege is held", () => {
    expect(visible(NONE)).toEqual(UNGATED_TABS);
  });

  it("gates Awaiting on canApprove", () => {
    expect(visible({ ...NONE, canApprove: true })).toEqual([
      QUEUE_TAB_AWAITING,
      ...UNGATED_TABS,
    ]);
  });

  it("gates Pending on canSubmit", () => {
    expect(visible({ ...NONE, canSubmit: true })).toEqual([
      QUEUE_TAB_DUE_SOON,
      QUEUE_TAB_PENDING,
      QUEUE_TAB_OVERDUE,
      QUEUE_TAB_ALL_PENDING,
      QUEUE_TAB_COMPLETED,
    ]);
  });

  it("gates Validation on canValidate", () => {
    expect(visible({ ...NONE, canValidate: true })).toEqual([
      QUEUE_TAB_DUE_SOON,
      QUEUE_TAB_VALIDATION,
      QUEUE_TAB_OVERDUE,
      QUEUE_TAB_ALL_PENDING,
      QUEUE_TAB_COMPLETED,
    ]);
  });

  it("shows the union of the gated tabs when several privileges are held", () => {
    expect(visible({ ...NONE, canApprove: true, canValidate: true })).toEqual([
      QUEUE_TAB_AWAITING,
      QUEUE_TAB_DUE_SOON,
      QUEUE_TAB_VALIDATION,
      QUEUE_TAB_OVERDUE,
      QUEUE_TAB_ALL_PENDING,
      QUEUE_TAB_COMPLETED,
    ]);
  });
});
