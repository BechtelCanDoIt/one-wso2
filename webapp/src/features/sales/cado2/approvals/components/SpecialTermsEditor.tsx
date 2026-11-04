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

import { useState, type JSX } from "react";
import { Alert, Button, Stack, Switch, Typography } from "@wso2/oxygen-ui";
import { CircleCheckIcon } from "@wso2/oxygen-ui-icons-react";
import { useWriteSpecialTerms } from "@features/sales/cado2/quotes/api/useQuoteApi";
import { messageOf } from "@features/sales/cado2/quotes/api/errors";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import LegalRichTextField from "@features/sales/cado2/components/legal-rich-text/LegalRichTextField";
import { cleanLegalText, sameLegalText } from "@features/sales/cado2/utils/legalRichText";

// The theme's switch knob is white, so it vanishes on a white card when off:
// a grey knob when off, the primary colour when on (as in the Legal step).
const VISIBLE_SWITCH = {
  "& .MuiSwitch-thumb": { bgcolor: "grey.600" },
  "& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb": { bgcolor: "primary.main" },
};

/**
 * Deal Desk's part of its approval (D128): the special terms, which only
 * Deal Desk writes. Saved on the submitted version (and in its history), no
 * new version. The switch guards against accidental terms: off, the quote
 * has none and the text is kept, unused. Approving then asks Legal to review
 * them.
 */
export default function SpecialTermsEditor({
  quoteId,
  versionNumber,
  enabled,
  text,
  billingSeesSpecialTerms,
  minHeight = 120,
}: {
  quoteId: number;
  versionNumber: number;
  /** The switch as saved. */
  enabled: boolean;
  /** The saved text, kept even while switched off; null when none. */
  text: string | null;
  /** Billing says See Special Terms (D86): the terms must describe it. */
  billingSeesSpecialTerms: boolean;
  /** The editor's height; taller in the lens's own section (D129). */
  minHeight?: number;
}): JSX.Element {
  const write = useWriteSpecialTerms(quoteId, versionNumber);
  const notify = useCado2Toast();
  const [on, setOn] = useState(enabled);
  const [special, setSpecial] = useState(text ?? "");
  // Saved and not changed since: the button says so, in green, until the next edit.
  const [saved, setSaved] = useState(false);
  // Compared as clean rich text, so opening the editor doesn't count as a change.
  const changed = on !== enabled || !sameLegalText(special, text ?? "");
  const blank = cleanLegalText(special) === "";

  const save = () =>
    write.mutate(
      { enabled: on, specialTerms: cleanLegalText(special) },
      {
        onSuccess: () => {
          setSaved(true);
          notify(on ? "Special terms saved" : "Special terms switched off");
        },
      },
    );

  return (
    <Stack spacing={2} aria-label="Special terms">
      {/* Only the switch changes it; the words beside it don't. */}
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Switch
          checked={on}
          onChange={(_, value) => {
            setSaved(false);
            setOn(value);
          }}
          sx={VISIBLE_SWITCH}
          slotProps={{ input: { role: "switch", "aria-label": "Special terms" } }}
        />
        <Typography variant="body2">Special terms</Typography>
      </Stack>
      {on ? (
        <LegalRichTextField
          label="Special terms"
          value={special}
          onChange={(html) => {
            setSaved(false);
            setSpecial(html);
          }}
          minHeight={minHeight}
          helperText={
            billingSeesSpecialTerms
              ? "Billing says See Special Terms: describe the billing here. Legal reviews the special terms after you approve."
              : "Legal reviews the special terms after you approve."
          }
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          {billingSeesSpecialTerms
            ? "Billing says See Special Terms: switch the special terms on and describe the billing."
            : "No special terms. Switch them on only if this deal needs them."}
        </Typography>
      )}
      {write.error ? <Alert severity="error">{messageOf(write.error) ?? "Couldn't save the special terms. Try again."}</Alert> : null}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Button variant="outlined" onClick={save} disabled={saved || !changed || (on && blank) || write.isPending}>
          {write.isPending ? "Saving…" : "Save special terms"}
        </Button>
        {saved ? (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "success.main" }} role="status">
            <CircleCheckIcon size={16} aria-hidden />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Saved on this version
            </Typography>
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );
}
