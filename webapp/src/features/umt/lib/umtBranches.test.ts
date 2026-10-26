// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy at
// http://www.apache.org/licenses/LICENSE-2.0

import { describe, expect, it } from "vitest";
import { isUmtBranchInProgress, umtComponentDirPathError, umtMonoRepoFields } from "./umtBranches";

describe("isUmtBranchInProgress", () => {
  it("treats Completed, Failed and Not created as settled", () => {
    expect(isUmtBranchInProgress({ status: "Completed" })).toBe(false);
    expect(isUmtBranchInProgress({ status: "Failed" })).toBe(false);
    expect(isUmtBranchInProgress({ status: "Not created" })).toBe(false);
  });

  it("treats any other status as still in progress", () => {
    expect(isUmtBranchInProgress({ status: "Pending" })).toBe(true);
    expect(isUmtBranchInProgress({ status: "In progress" })).toBe(true);
    expect(isUmtBranchInProgress({ status: null })).toBe(true);
  });
});

describe("umtComponentDirPathError", () => {
  it("asks for a directory when the repository is a mono repo", () => {
    expect(umtComponentDirPathError(true, "")).toBe("Component Directory Path is required");
    expect(umtComponentDirPathError(true, "   ")).toBe("Component Directory Path is required");
  });

  it("accepts a named directory", () => {
    expect(umtComponentDirPathError(true, "components/identity")).toBeUndefined();
  });

  it("needs no directory when the repository holds one component", () => {
    expect(umtComponentDirPathError(false, "")).toBeUndefined();
  });
});

describe("umtMonoRepoFields", () => {
  it("names the mono repo and its trimmed directory", () => {
    expect(umtMonoRepoFields(true, "  components/identity ")).toEqual({
      isMonoRepo: true,
      componentDirPath: "components/identity",
    });
  });

  it("adds nothing for a repository that holds one component, whatever directory was typed", () => {
    expect(umtMonoRepoFields(false, "components/identity")).toEqual({});
  });
});
