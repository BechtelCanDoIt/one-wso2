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
import { hasAnyGroup } from "@hooks/useAsgardeoGroups";
import { AMPLIFY_CURRENT_POSTS_ITEM_ID, AMPLIFY_NEW_POST_ITEM_ID } from "@constants/perspectives";
import { AMPLIFY_EDITOR_GROUPS, amplifyEditorVisibility } from "./useAmplifyEditorAccess";

const retry = () => undefined;

describe("amplifyEditorVisibility", () => {
  it("shows New Post and Current Posts to an editor", () => {
    const v = amplifyEditorVisibility({ hasAccess: true, isResolving: false, retry });
    expect(v.canSee(AMPLIFY_NEW_POST_ITEM_ID)).toBe(true);
    expect(v.canSee(AMPLIFY_CURRENT_POSTS_ITEM_ID)).toBe(true);
  });

  it("hides them from everyone else", () => {
    const v = amplifyEditorVisibility({ hasAccess: false, isResolving: false, retry });
    expect(v.canSee(AMPLIFY_NEW_POST_ITEM_ID)).toBe(false);
    expect(v.canSee(AMPLIFY_CURRENT_POSTS_ITEM_ID)).toBe(false);
  });

  it("fails closed while the token is still being decoded", () => {
    const v = amplifyEditorVisibility({ hasAccess: true, isResolving: true, retry });
    expect(v.canSee(AMPLIFY_NEW_POST_ITEM_ID)).toBe(false);
    expect(v.resolving).toBe(true);
  });

  it("answers only for the rows it claims", () => {
    const v = amplifyEditorVisibility({ hasAccess: true, isResolving: false, retry });
    expect(v.canSee("amplify-celebrate")).toBe(false);
  });
});

describe("AMPLIFY_EDITOR_GROUPS", () => {
  it("is exactly PO and Marketing", () => {
    expect(hasAnyGroup(["amplify_po"], AMPLIFY_EDITOR_GROUPS)).toBe(true);
    expect(hasAnyGroup(["amplify_marketing"], AMPLIFY_EDITOR_GROUPS)).toBe(true);
    expect(hasAnyGroup(["amplify_admin", "amplify_slt"], AMPLIFY_EDITOR_GROUPS)).toBe(false);
    expect(hasAnyGroup(["amplify_po_typo"], AMPLIFY_EDITOR_GROUPS)).toBe(false);
  });
});
