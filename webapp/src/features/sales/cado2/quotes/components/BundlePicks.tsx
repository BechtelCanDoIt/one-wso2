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

import type { JSX } from "react";
import { Box, Checkbox, Chip, FormControlLabel, MenuItem, Radio, RadioGroup, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import type { BundleChild } from "@features/sales/cado2/quotes/api/quoteTypes";
import { bundleChoices, type BundlePicksValue } from "@features/sales/cado2/quotes/form/bundlePicks";

/** A choice of more than this many is a dropdown, not radio buttons. */
const RADIO_MAX = 4;
/** More optional products than this scroll in a short list. */
const OPTIONAL_SCROLL = 6;
/** Options in two even columns (one on a narrow screen), so long names don't crowd the others. */
const GRID = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, columnGap: 2 } as const;

const quantityText = (c: BundleChild, parentQuantity: string) =>
  c.fixedQuantity === null ? `× ${parentQuantity || "1"}, as the parent` : `× ${c.fixedQuantity}, always`;

function Row({ title, hint, need, children }: { title: string; hint: string; need?: boolean; children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "140px 1fr" }, gap: 1.5, py: 1.25, borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0 } }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, color: need ? "warning.dark" : "text.primary" }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

/**
 * What comes with a bundle parent (D131), as the Admin set it: the
 * always-included products, locked; one pick per named choice, nothing
 * picked for the AM; the optional ones to tick. The AM can't add a child
 * outside the bundle or change a quantity.
 */
export default function BundlePicks({
  items: children,
  value,
  onChange,
  parentQuantity,
  showMissing,
}: {
  /** The bundle's children, as the Admin set them. */
  readonly items: readonly BundleChild[];
  readonly value: BundlePicksValue;
  readonly onChange: (v: BundlePicksValue) => void;
  readonly parentQuantity: string;
  /** After a try to save: mark the choices still to make. */
  readonly showMissing: boolean;
}): JSX.Element {
  const always = children.filter((c) => c.addMode !== "CHOOSE_ONE" && c.addMode !== "OPTIONAL");
  const optional = children.filter((c) => c.addMode === "OPTIONAL");
  const choices = bundleChoices(children);
  const label = (c: BundleChild) => (
    <Stack direction="row" spacing={0.75} alignItems="baseline" component="span">
      <span>{c.name ?? c.id}</span>
      <Typography component="span" variant="caption" color="text.secondary">
        {quantityText(c, parentQuantity)}
      </Typography>
    </Stack>
  );
  return (
    <Box component="section" aria-label="Comes with it" sx={{ border: 1, borderColor: "divider", borderRadius: 2, px: 2, py: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, pt: 0.5 }}>
        Comes with it
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
        Same year and dates as this product. Removed only with it.
      </Typography>
      {always.length ? (
        <Row title="Included" hint="Always comes with it">
          <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
            {always.map((c) => (
              <Chip key={c.id} variant="outlined" label={<>{label(c)}</>} aria-label={`${c.name ?? c.id}, included`} />
            ))}
          </Stack>
        </Row>
      ) : (
        <></>
      )}
      {[...choices.entries()].map(([name, options]) => {
        const picked = value.choices[name] ?? "";
        const need = showMissing && !picked;
        return (
          <Row key={name} title={name} hint={need ? "Pick one: required" : "Pick one"} need={need}>
            {options.length > RADIO_MAX ? (
              // Many options: a dropdown, still with nothing picked for the AM.
              <TextField
                select
                size="small"
                fullWidth
                value={picked}
                onChange={(e) => onChange({ ...value, choices: { ...value.choices, [name]: e.target.value } })}
                error={need}
                slotProps={{
                  select: { displayEmpty: true, renderValue: (v) => (v ? (options.find((o) => o.id === v)?.name ?? String(v)) : `Pick a ${name.toLowerCase()}`) },
                  htmlInput: { "aria-label": name },
                }}
              >
                {options.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {label(c)}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <RadioGroup
                aria-label={name}
                value={picked}
                onChange={(e) => onChange({ ...value, choices: { ...value.choices, [name]: e.target.value } })}
                sx={GRID}
              >
                {options.map((c) => (
                  <FormControlLabel key={c.id} value={c.id} control={<Radio size="small" />} label={label(c)} sx={{ mr: 0, minWidth: 0 }} />
                ))}
              </RadioGroup>
            )}
          </Row>
        );
      })}
      {optional.length ? (
        <Row title="Optional" hint="Any, or none">
          <Box
            role="group"
            aria-label="Optional"
            sx={{
              ...GRID,
              // A long list scrolls in place rather than stretching the dialog.
              ...(optional.length > OPTIONAL_SCROLL
                ? { maxHeight: 176, overflowY: "auto", border: 1, borderColor: "divider", borderRadius: 1.5, px: 1 }
                : {}),
            }}
          >
            {optional.map((c) => (
              <FormControlLabel
                key={c.id}
                control={
                  <Checkbox
                    size="small"
                    checked={value.optional.includes(c.id)}
                    onChange={(_, on) =>
                      onChange({ ...value, optional: on ? [...value.optional, c.id] : value.optional.filter((id) => id !== c.id) })
                    }
                  />
                }
                label={label(c)}
                sx={{ mr: 0, minWidth: 0 }}
              />
            ))}
          </Box>
        </Row>
      ) : (
        <></>
      )}
    </Box>
  );
}
