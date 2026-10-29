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

// The recipients box: Enter makes a chip, a pasted list makes one chip per address, an
// invalid address stays in the box with a message, and Save sends the chips. Then the
// controls lock while a save is in flight, and a test email is reported as sent only
// when the server says it was.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mutateAsync = vi.fn();
const testMutateAsync = vi.fn();
const saving = vi.hoisted(() => ({ value: false }));

vi.mock("../../components/MarketingOpsShell", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@constants/marketingOpsApps", () => ({ MARKETING_OPS_EYEBROW: { admin: {} } }));
vi.mock("../../api/useEvents", () => ({
  useNotificationSettings: () => ({
    data: { enabled: false, recipients: ["ana@wso2.com"], delivery_configured: true },
    isError: false,
  }),
  useSaveNotificationSettings: () => ({ mutateAsync, isPending: saving.value }),
  useSendTestNotification: () => ({ mutateAsync: testMutateAsync, isPending: false }),
}));

import EventsNotificationsPage from "./EventsNotificationsPage";

const box = () => screen.getByRole("combobox");
const chips = () =>
  Array.from(document.querySelectorAll(".MuiChip-label")).map((el) => el.textContent);

describe("recipients chip input", () => {
  beforeEach(() => {
    saving.value = false;
    mutateAsync.mockReset().mockResolvedValue({});
  });

  it("shows the saved recipients as chips", () => {
    render(<EventsNotificationsPage />);
    expect(chips()).toEqual(["ana@wso2.com"]);
  });

  it("turns a typed address into a chip on Enter", () => {
    render(<EventsNotificationsPage />);
    fireEvent.change(box(), { target: { value: "ben@wso2.com" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(chips()).toEqual(["ana@wso2.com", "ben@wso2.com"]);
    expect(box()).toHaveValue("");
  });

  it("keeps a non-address in the box, with a message, instead of making a chip", () => {
    render(<EventsNotificationsPage />);
    fireEvent.change(box(), { target: { value: "Hasina" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(chips()).toEqual(["ana@wso2.com"]);
    expect(box()).toHaveValue("Hasina");
    expect(screen.getByText("“Hasina” isn’t an email address.")).toBeInTheDocument();
  });

  it("splits a pasted list into one chip per address, skipping duplicates", () => {
    render(<EventsNotificationsPage />);
    fireEvent.change(box(), { target: { value: "cy@wso2.com, ANA@wso2.com; dee@wso2.com" } });
    expect(chips()).toEqual(["ana@wso2.com", "cy@wso2.com", "dee@wso2.com"]);
  });

  it("removes a chip with its delete icon", () => {
    render(<EventsNotificationsPage />);
    fireEvent.click(document.querySelector(".MuiChip-deleteIcon")!);
    expect(chips()).toEqual([]);
  });

  it("saves the chips, including an address still in the box", () => {
    render(<EventsNotificationsPage />);
    fireEvent.change(box(), { target: { value: "ben@wso2.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mutateAsync).toHaveBeenCalledWith({
      enabled: false,
      recipients: ["ana@wso2.com", "ben@wso2.com"],
    });
  });
});

describe("while a save is in flight", () => {
  beforeEach(() => {
    saving.value = true;
  });

  it("locks the switch and the recipients box, so no edit is lost when it lands", () => {
    render(<EventsNotificationsPage />);
    expect(screen.getByLabelText("Email the reviewers when a list is submitted")).toBeDisabled();
    expect(box()).toBeDisabled();
  });
});

describe("send a test email", () => {
  beforeEach(() => {
    saving.value = false;
    testMutateAsync.mockReset();
  });

  it("reports the send when the server confirms it", async () => {
    testMutateAsync.mockResolvedValue({ sent: true, recipients: 1 });
    render(<EventsNotificationsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Send a test email" }));
    expect(await screen.findByText(/Test email sent to 1 recipient\./)).toBeInTheDocument();
  });

  it("reports a failure, not a send, when the server says nothing went out", async () => {
    testMutateAsync.mockResolvedValue({ sent: false, recipients: 1 });
    render(<EventsNotificationsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Send a test email" }));
    expect(
      await screen.findByText(/didn't confirm the test email was sent/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Test email sent/)).not.toBeInTheDocument();
  });
});
