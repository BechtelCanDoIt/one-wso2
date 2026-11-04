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
import SpecialTermsEditor from "./SpecialTermsEditor";

const write = { mutate: vi.fn(), isPending: false, error: null as unknown };
vi.mock("@features/sales/cado2/quotes/api/useQuoteApi", () => ({ useWriteSpecialTerms: () => write }));
vi.mock("@features/sales/cado2/components/toast/toastContext", () => ({ useCado2Toast: () => vi.fn() }));
// The rich-text editor as a plain text box, so the test can type into it.
vi.mock("@features/sales/cado2/components/legal-rich-text/LegalRichTextField", () => ({
  default: ({ label, value, onChange, helperText }: { label: string; value: string; onChange: (v: string) => void; helperText?: string }) => (
    <>
      <textarea aria-label={label} defaultValue={value} onChange={(e) => onChange(e.target.value)} />
      <p>{helperText}</p>
    </>
  ),
}));

// D128: Deal Desk writes the special terms during its approval, behind a switch.
describe("SpecialTermsEditor", () => {
  it("switches the special terms on, then saves them", async () => {
    write.mutate.mockClear();
    render(<SpecialTermsEditor quoteId={7} versionNumber={1} enabled={false} text={null} billingSeesSpecialTerms={false} />);
    const user = userEvent.setup();
    const save = screen.getByRole("button", { name: "Save special terms" });
    expect(save).toBeDisabled();
    expect(screen.getByText(/No special terms. Switch them on only if this deal needs them/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Special terms" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Special terms" }));
    expect(save).toBeDisabled(); // on with nothing written
    await user.type(screen.getByRole("textbox", { name: "Special terms" }), "Customer may terminate on 30 days' notice.");
    await user.click(save);
    expect(write.mutate).toHaveBeenCalledWith(
      { enabled: true, specialTerms: "Customer may terminate on 30 days' notice." },
      expect.anything(),
    );
  });

  it("switching off keeps the text, unused", async () => {
    write.mutate.mockClear();
    render(<SpecialTermsEditor quoteId={7} versionNumber={1} enabled text="Old terms" billingSeesSpecialTerms />);
    const user = userEvent.setup();
    expect(screen.getByText(/Billing says See Special Terms: describe the billing here/)).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Special terms" }));
    expect(screen.getByText(/switch the special terms on and describe the billing/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save special terms" }));
    expect(write.mutate).toHaveBeenCalledWith({ enabled: false, specialTerms: "Old terms" }, expect.anything());
  });
});
