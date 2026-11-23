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

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { Attachment, AttachmentsDraft } from "../types";
import AttachmentsField from "./AttachmentsField";
import { attachmentProblem, emptyAttachments, MAX_ATTACHMENT_BYTES } from "./attachmentRules";

const pdf = (name: string, size = 10) => new File([new Uint8Array(size)], name, { type: "application/pdf" });
const saved = (id: string, name: string): Attachment => ({ id, name, contentType: "application/pdf", sizeBytes: 2048, scanStatus: "clean", uploadedBy: "me@example.com", uploadedAt: "2026-11-02T00:00:00Z" });

describe("attachmentProblem", () => {
  it("accepts PDF, Word, Excel, PowerPoint, PNG and JPEG, whatever the case of the extension", () => {
    for (const name of ["a.pdf", "a.DOCX", "a.xls", "a.pptx", "a.png", "a.JPG", "a.jpeg"]) expect(attachmentProblem(pdf(name), emptyAttachments()), name).toBeNull();
  });

  it("refuses other types, empty files and files over 10 MB, saying which", () => {
    expect(attachmentProblem(pdf("run.exe"), emptyAttachments())).toBe('"run.exe" is not a type that can be attached.');
    expect(attachmentProblem(pdf("empty.pdf", 0), emptyAttachments())).toBe('"empty.pdf" is empty.');
    expect(attachmentProblem(pdf("big.pdf", MAX_ATTACHMENT_BYTES + 1), emptyAttachments())).toBe('"big.pdf" is larger than 10 MB.');
  });

  it("refuses an eleventh file, counting those the request already holds", () => {
    const draft: AttachmentsDraft = { saved: [saved("1", "a.pdf")], removed: [], files: Array.from({ length: 9 }, (_, i) => pdf(`f${i}.pdf`)) };
    expect(attachmentProblem(pdf("one-more.pdf"), draft)).toBe("A request can have at most 10 files.");
    expect(attachmentProblem(pdf("one-more.pdf"), { ...draft, files: draft.files.slice(1) })).toBeNull();
  });
});

describe("AttachmentsField", () => {
  function Harness({ initial = emptyAttachments(), onChange }: { initial?: AttachmentsDraft; onChange?: (next: AttachmentsDraft) => void }) {
    const [value, setValue] = useState(initial);
    return (
      <AttachmentsField
        label="Quotes"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
    );
  }

  it("lists the files chosen, with their size, and takes one off again", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.upload(screen.getByLabelText("Quotes", { selector: "input" }), [pdf("quote.pdf", 2048), pdf("spec.pdf", 100)]);
    expect(screen.getByText("quote.pdf")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove quote.pdf" }));
    expect(screen.queryByText("quote.pdf")).toBeNull();
    expect(screen.getByText("spec.pdf")).toBeInTheDocument();
  });

  it("refuses a file that cannot be attached with the reason, and keeps the rest of the choice", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.upload(screen.getByLabelText("Quotes", { selector: "input" }), [new File(["x"], "run.exe"), pdf("quote.pdf")]);
    expect(screen.getByRole("alert")).toHaveTextContent('"run.exe" is not a type that can be attached.');
    expect(screen.getByText("quote.pdf")).toBeInTheDocument();
    expect(onChange.mock.lastCall?.[0].files.map((f: File) => f.name)).toEqual(["quote.pdf"]);
  });

  it("marks a saved file to be removed on submit, instead of forgetting it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={{ saved: [saved("4", "old-quote.pdf")], removed: [], files: [] }} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Remove old-quote.pdf" }));
    expect(screen.queryByText("old-quote.pdf")).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith({ saved: [], removed: ["4"], files: [] });
  });
});
