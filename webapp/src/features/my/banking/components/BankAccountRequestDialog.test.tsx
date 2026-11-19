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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useBanksMock = vi.hoisted(() => vi.fn());
vi.mock("@features/my/api/useBanks", () => ({
  useBanks: (enabled: boolean) => useBanksMock(enabled),
}));

vi.mock("@features/my/api/useCreateBankAccountRequest", () => ({
  useCreateBankAccountRequest: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import BankAccountRequestDialog from "./BankAccountRequestDialog";
import type { AccountType, CustomLocationMapEntry } from "@features/my/api/types";

/** Banks on file, filed under their full country names. */
const BANKS = [
  { bankName: "Central Bank of Sri Lanka", swiftCode: "CBCELKLX", bankCode: "8004", bankLocation: "Sri Lanka" },
  { bankName: "Hongkong Shanghai Bank", swiftCode: "HSBCSGS2", bankCode: "HSBC", bankLocation: "Singapore" },
  { bankName: "Bank of America", swiftCode: "BOFAUS3N", bankCode: "BOFA", bankLocation: "United States" },
];

/** Its location is not spelled the way the backend's country map spells it. */
const ODDLY_FILED_BANK = { bankName: "Odd Bank", swiftCode: "ODDBUS33", bankCode: "ODD", bankLocation: "USA" };

function renderDialog(props: {
  accountType?: AccountType;
  allowAnyBankLocation?: boolean;
  employeeWorkLocation?: string;
  customLocationMap?: CustomLocationMapEntry[];
}) {
  return render(
    <BankAccountRequestDialog
      accountType={props.accountType ?? "CONSULTANCY"}
      employeeEmail="person@wso2.com"
      allCountries={["Sri Lanka", "Singapore", "United States"]}
      employeeWorkLocation={props.employeeWorkLocation ?? "Sri Lanka"}
      customLocationMap={props.customLocationMap ?? []}
      allowAnyBankLocation={props.allowAnyBankLocation}
      onClose={vi.fn()}
      onSuccess={vi.fn()}
    />,
  );
}

/**
 * Step 1 is mandatory, so every Bank Location assertion has to pass it
 * first. The city is asked of Consultancy only.
 */
async function goToBankInfo(user: ReturnType<typeof userEvent.setup>, accountType: AccountType = "CONSULTANCY") {
  await user.type(screen.getByLabelText(/Account Holder's Name/i), "Person Person");
  await user.type(screen.getByLabelText(/Account Holder's Address/i), "No 23, Galle Road, Colombo");
  if (accountType === "CONSULTANCY") {
    await user.type(screen.getByLabelText(/Account Holder's City/i), "Colombo");
  }
  const country = screen.getByLabelText(/Account Holder's Country/i);
  await user.click(country);
  await user.click(await screen.findByRole("option", { name: "Sri Lanka" }));
  await user.type(screen.getByLabelText(/Account No/i), "1234567890");
  await user.click(screen.getByRole("button", { name: /Continue/i }));
}

async function bankLocationOptions(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText(/Bank Location/i));
  const listbox = await screen.findByRole("listbox");
  return within(listbox)
    .getAllByRole("option")
    .map((option) => option.textContent);
}

beforeEach(() => {
  useBanksMock.mockReturnValue({ data: { banks: BANKS }, isLoading: false, isError: false });
});

describe("BankAccountRequestDialog Bank Location options", () => {
  it("keeps Consultancy on the employee's own location when the flag is unset", async () => {
    const user = userEvent.setup();
    renderDialog({});
    await goToBankInfo(user);

    expect(await bankLocationOptions(user)).toEqual(["Sri Lanka"]);
  });

  it("offers every location on file once an Admin files on someone's behalf", async () => {
    const user = userEvent.setup();
    renderDialog({ allowAnyBankLocation: true });
    await goToBankInfo(user);

    const options = await bankLocationOptions(user);
    expect(options).toContain("Singapore");
    expect(options).toContain("United States");
    // The employee's own location is still there, not replaced by the rest.
    expect(options).toContain("Sri Lanka");
  });

  // "US" is what the map carries, and the banks above are filed under
  // "United States". The backend validates Bank Location against the same
  // country map `allCountries` is built from, which has the full name and
  // not the abbreviation — so offering "US" buys a 400 at Save, after all
  // three steps have been filled in.
  it("offers a mapped location under the name a submission can use, not the abbreviation", async () => {
    const user = userEvent.setup();
    renderDialog({
      allowAnyBankLocation: true,
      employeeWorkLocation: "Sri Lanka",
      customLocationMap: [{ location: "Sri Lanka", customMap: ["US"] }],
    });
    await goToBankInfo(user);

    const options = await bankLocationOptions(user);
    expect(options).toContain("United States");
    expect(options).not.toContain("US");
  });

  it("starts an Admin's Consultancy request on a location that is among the options", async () => {
    const user = userEvent.setup();
    renderDialog({
      allowAnyBankLocation: true,
      employeeWorkLocation: "Sri Lanka",
      customLocationMap: [{ location: "Sri Lanka", customMap: ["US"] }],
    });
    await goToBankInfo(user);

    expect(screen.getByLabelText(/Bank Location/i)).toHaveValue("United States");
  });

  // /banks is free to return a row with no location — the backend's own Bank
  // record has it nullable, whatever the frontend type says. A null reaching
  // the option list throws out of the Autocomplete's default label reader and
  // takes the whole step down with it.
  //
  // Asserted through Salary, which is where this list has nothing else
  // standing between a null and the options: Consultancy's is checked
  // against allCountries afterwards, and that drops a null too.
  it("ignores a bank filed with no location at all", async () => {
    const user = userEvent.setup();
    useBanksMock.mockReturnValue({
      data: {
        banks: [...BANKS, { bankName: "Nowhere Bank", swiftCode: "NOWH", bankCode: "NW", bankLocation: null }],
      },
      isLoading: false,
      isError: false,
    });
    renderDialog({ accountType: "SALARY" });
    await goToBankInfo(user, "SALARY");

    const options = await bankLocationOptions(user);
    expect(options).toContain("Sri Lanka");
    expect(options).toContain("Singapore");
  });

  // A bank row's location is free text, so it need not be spelled the way
  // the country map the backend checks against spells it. Offering one
  // Consultancy can't use only moves the refusal to the end of the form.
  it("drops a Consultancy location the backend would not recognise", async () => {
    const user = userEvent.setup();
    useBanksMock.mockReturnValue({
      data: { banks: [...BANKS, ODDLY_FILED_BANK] },
      isLoading: false,
      isError: false,
    });
    renderDialog({ allowAnyBankLocation: true });
    await goToBankInfo(user);

    const options = await bankLocationOptions(user);
    expect(options).not.toContain("USA");
    expect(options).toContain("United States");
  });

  // Only Consultancy's Bank Location is checked by the backend, so narrowing
  // the other two to the country map would take away options it accepts.
  it("leaves Salary's options as the banks on file, unnarrowed", async () => {
    const user = userEvent.setup();
    useBanksMock.mockReturnValue({
      data: { banks: [...BANKS, ODDLY_FILED_BANK] },
      isLoading: false,
      isError: false,
    });
    renderDialog({ accountType: "SALARY" });
    await goToBankInfo(user, "SALARY");

    expect(await bankLocationOptions(user)).toContain("USA");
  });
});
