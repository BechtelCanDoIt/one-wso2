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

// Create Update and Add Product: the issue, version and email rules each form
// enforces before it submits.

import { describe, expect, it } from "vitest";
import {
  buildUmtCreateUpdateRequest,
  isCreateUpdateFormValid,
  laterDate,
  nextThursday,
  type UmtCreateUpdateFormValues,
} from "../lib/umtCreateUpdate";
import {
  buildUmtCreateProductRequest,
  EMPTY_CREATE_PRODUCT_FORM,
  isCreateProductFormValid,
  type UmtCreateProductFormValues,
} from "../lib/umtProducts";

const best = nextThursday();

const REGULAR: UmtCreateUpdateFormValues = {
  isProactive: false,
  isHotfix: false,
  updateType: "regular",
  issueType: "bug",
  caseId: "CS0012345",
  internalGitIssue: "https://github.com/wso2-enterprise/wso2-apim-internal/issues/12",
  publicOrSecurityGitIssue: "https://github.com/wso2/api-manager/issues/34",
  productId: 7,
  bestCaseEstimate: best,
  mostLikelyEstimate: laterDate(best, 7),
  worstCaseEstimate: laterDate(best, 14),
};

const SECURITY: UmtCreateUpdateFormValues = {
  ...REGULAR,
  updateType: "security",
  publicOrSecurityGitIssue: "https://github.com/wso2-enterprise/security-internals/issues/99",
};

describe("Create Update", () => {
  it("accepts a complete regular update and a complete security update", () => {
    expect(isCreateUpdateFormValid(REGULAR)).toBe(true);
    expect(isCreateUpdateFormValid(SECURITY)).toBe(true);
  });

  it("requires a CS-prefixed case id unless the update is proactive", () => {
    expect(isCreateUpdateFormValid({ ...REGULAR, caseId: "" })).toBe(false);
    expect(isCreateUpdateFormValid({ ...REGULAR, caseId: "12345" })).toBe(false);
    expect(isCreateUpdateFormValid({ ...REGULAR, caseId: "", isProactive: true })).toBe(true);
  });

  it("requires a product", () => {
    expect(isCreateUpdateFormValid({ ...REGULAR, productId: null })).toBe(false);
  });

  it("sends the security issue as securityInternalGitIssue and N/A as the public issue", () => {
    const request = buildUmtCreateUpdateRequest(SECURITY);
    expect(request.securityInternalGitIssue).toBe(SECURITY.publicOrSecurityGitIssue);
    expect(request.publicGitIssue).toBe("N/A");
  });

  it("only accepts a wso2-enterprise/security-internals issue for a security update", () => {
    const withIssue = (publicOrSecurityGitIssue: string) => ({ ...SECURITY, publicOrSecurityGitIssue });

    expect(isCreateUpdateFormValid(withIssue("https://github.com/wso2-enterprise/product-apim-internal/issues/5"))).toBe(
      false,
    );
    expect(isCreateUpdateFormValid(withIssue("https://github.com/wso2/security-internals/issues/5"))).toBe(false);
    expect(isCreateUpdateFormValid(withIssue("https://github.com/wso2-enterprise/security-internals/pull/5"))).toBe(
      false,
    );
    expect(isCreateUpdateFormValid(withIssue("https://github.com/wso2-enterprise/security-internals/issues/5"))).toBe(
      true,
    );
  });

  it("accepts a trailing slash on a security issue URL, as it does on a public one", () => {
    const withIssue = (publicOrSecurityGitIssue: string) => ({ ...SECURITY, publicOrSecurityGitIssue });

    expect(isCreateUpdateFormValid(withIssue("https://github.com/wso2-enterprise/security-internals/issues/5/"))).toBe(
      true,
    );
    expect(isCreateUpdateFormValid(withIssue("https://github.com/wso2-enterprise/security-internals/issues/5//"))).toBe(
      false,
    );
  });

  it("keeps accepting any WSO2 issue as the public issue of a non-security update", () => {
    expect(
      isCreateUpdateFormValid({
        ...REGULAR,
        publicOrSecurityGitIssue: "https://github.com/wso2-enterprise/product-apim-internal/issues/5",
      }),
    ).toBe(true);
  });
});

const PRODUCT: UmtCreateProductFormValues = {
  name: "wso2am",
  version: "4.2.0",
  leadMail: "lead@wso2.com",
  edMail: "ed@wso2.com",
  ftpHost: "ftp.wso2.com",
  ftpPort: "22",
  ftpUsername: "uploader",
  ftpPassword: "secret",
  ftpAbsolutePath: "/updates",
};

describe("Add Product", () => {
  it("accepts a complete product and rejects an empty or whitespace-only field", () => {
    expect(isCreateProductFormValid(PRODUCT)).toBe(true);
    expect(isCreateProductFormValid(EMPTY_CREATE_PRODUCT_FORM)).toBe(false);
    expect(isCreateProductFormValid({ ...PRODUCT, ftpHost: "   " })).toBe(false);
  });

  it("suffixes the base version with .0.full", () => {
    expect(buildUmtCreateProductRequest(PRODUCT).version).toBe("4.2.0.0.full");
  });

  it("accepts only an X.Y.Z product version", () => {
    for (const version of ["4.0.0.1", "v4.0.0", "4.0", "4", "4.0.x", "4.0.0-beta", "4..0"]) {
      expect(isCreateProductFormValid({ ...PRODUCT, version })).toBe(false);
    }
    expect(isCreateProductFormValid({ ...PRODUCT, version: "4.0.0" })).toBe(true);
    expect(isCreateProductFormValid({ ...PRODUCT, version: "10.12.345" })).toBe(true);
  });

  it("ignores the whitespace around a product version, as the request does", () => {
    const padded = { ...PRODUCT, version: " 4.2.0 " };

    expect(isCreateProductFormValid(padded)).toBe(true);
    expect(buildUmtCreateProductRequest(padded).version).toBe("4.2.0.0.full");
  });
});
