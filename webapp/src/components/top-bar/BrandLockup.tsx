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
import { Box, Header } from "@wso2/oxygen-ui";
import ChoreoLabsMark from "./ChoreoLabsMark";

// Sora is set on the wordmark itself rather than taken from the theme, so the
// lockup stays the same whichever theme is picked.
export const BRAND_FONT_FAMILY = "'Sora Variable', sans-serif";
export const BRAND_FONT_PX = 24;
export const BRAND_MARK_PX = 24;
// 0.3x the mark height.
export const BRAND_GAP_PX = "7px";
// The mark sits inline in the wordmark's line, so `vertical-align` places its
// bottom edge relative to the baseline. Half a cap height (0.5cap, resolved on
// Sora at the wordmark's size) less half the mark height centres the mark on
// the "O", so the thin dots overshoot it equally above and below.
export const BRAND_MARK_ALIGN = `calc(0.5cap - ${BRAND_MARK_PX / 2}px)`;
// Clear space of half the mark height.
export const BRAND_CLEAR_SPACE = `${BRAND_MARK_PX / 2}px`;

/**
 * Props for the BrandLockup component.
 */
export interface BrandLockupProps {
  /** Optional id attribute passed to the brand title text (e.g. for aria-labelledby). */
  titleId?: string;
}

/**
 * Standard One WSO2 brand lockup component.
 * Combines the ChoreoLabsMark with the "One" wordmark in Sora typography.
 */
export default function BrandLockup({ titleId }: BrandLockupProps): JSX.Element {
  return (
    <Header.BrandTitle
      sx={{
        display: "block",
        whiteSpace: "nowrap",
        fontFamily: BRAND_FONT_FAMILY,
        fontWeight: 600,
        fontSize: { xs: BRAND_FONT_PX, sm: BRAND_FONT_PX },
        lineHeight: 0,
      }}
    >
      <Box
        component={ChoreoLabsMark}
        sx={{
          height: BRAND_MARK_PX,
          mr: BRAND_GAP_PX,
          verticalAlign: BRAND_MARK_ALIGN,
        }}
      />
      {titleId ? (
        <Box component="span" id={titleId}>
          One
        </Box>
      ) : (
        "One"
      )}
    </Header.BrandTitle>
  );
}
