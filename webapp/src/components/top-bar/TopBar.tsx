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

import { useEffect, type JSX } from "react";
import {
  Box,
  ColorSchemeToggle,
  Header,
  IconButton,
  Tooltip,
  Typography,
} from "@wso2/oxygen-ui";
import { MenuIcon, SearchIcon } from "@wso2/oxygen-ui-icons-react";
import AppsGridIcon from "./AppsGridIcon";
import ChoreoLabsMark from "./ChoreoLabsMark";
import { Link as RouterLink } from "react-router";
import { landingPath } from "@config/landingConfig";
import PinnedTabs from "@features/pinned/components/PinnedTabs";
import PinThisPageButton from "@features/pinned/components/PinThisPageButton";
import StoreButton from "@features/swag-store/components/StoreButton";
import { usePinnedEntries } from "@features/pinned/usePinned";
import ThemeSelect from "./ThemeSelect";
import UserProfileMenu from "./UserProfileMenu";

// The shortcut hint has to name a key the reader actually has: the handler
// below accepts Cmd *or* Ctrl, so a hardcoded "⌘K" misinforms every
// Windows and Linux user.
//
// `navigator.platform` is formally deprecated, and that is not a reason to
// replace it here: no engine intends to remove it (too much of the web reads
// it), while its stated successor `navigator.userAgentData` is unimplemented in
// Firefox and Safari and absent from TypeScript's DOM lib. A layered check
// would therefore fall through to this same call on two of three engines while
// costing an ambient type declaration. Read once — the platform cannot change
// at runtime. iPadOS reporting as Mac is correct rather than a bug: an iPad
// with a keyboard has a Cmd key.
const IS_APPLE_PLATFORM =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** No "+" in either form, matching the badge's compact style. */
const SHORTCUT_HINT = IS_APPLE_PLATFORM ? "⌘K" : "Ctrl K";

// Brand lockup: the Choreo Labs mark, then "One" in Sora 600, one size at every
// breakpoint. The mark is as tall as the font size: its dense middle dots then
// line up with the letters and only the thin top and bottom dots reach past
// them. Any larger and the mark outweighs the word and crowds the 56/64px bar.
//
// Sora is set on the wordmark itself rather than taken from the theme, so the
// lockup stays the same whichever theme is picked.
const BRAND_FONT_FAMILY = "'Sora Variable', sans-serif";
const BRAND_FONT_PX = 24;
const BRAND_MARK_PX = 24;
// 0.3x the mark height.
const BRAND_GAP_PX = "7px";
// The mark sits inline in the wordmark's line, so `vertical-align` places its
// bottom edge relative to the baseline. Half a cap height (0.5cap, resolved on
// Sora at the wordmark's size) less half the mark height centres the mark on
// the "O", so the thin dots overshoot it equally above and below. Centring on
// the x-height instead left the mark hanging low beside the capital.
const BRAND_MARK_ALIGN = `calc(0.5cap - ${BRAND_MARK_PX / 2}px)`;
// Clear space of half the mark height. To the left, the toggle is already
// further away than that; to the right, the search trigger would sit one header
// gap (8px) from "One" without it.
const BRAND_CLEAR_SPACE = `${BRAND_MARK_PX / 2}px`;

interface TopBarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  /** Receives the button element, so the launcher can hang off it. */
  onToggleWaffle: (anchor: HTMLElement) => void;
  /** Whether the launcher is currently showing, for aria-expanded. */
  waffleOpen: boolean;
  onOpenAsk: () => void;
}

// The persistent top bar, on Oxygen's compound `Header`, in the order the
// component expects: Toggle → Brand → (switcher/search) → Spacer → Actions.
//
// Oxygen supplies the bar's height, background, border, and brand-title
// typography, so nothing here sets those. The rail-width-matching `width: 260`
// the old hand-rolled bar used is gone with it — Oxygen's Sidebar is 250/64 and
// the header no longer needs to align to it.
export default function TopBar({
  collapsed,
  onToggleSidebar,
  onToggleWaffle,
  waffleOpen,
  onOpenAsk,
}: TopBarProps): JSX.Element {
  // Only the count matters here — the strip itself renders the entries.
  const hasPinned = usePinnedEntries().length > 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenAsk();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenAsk]);

  return (
    <Header>
      {/* The hamburger in both states: Oxygen's default collapse icon carries a
          left arrow, and in this corner that reads as Back. */}
      <Header.Toggle
        collapsed={collapsed}
        onToggle={onToggleSidebar}
        expandIcon={<MenuIcon size={20} />}
        collapseIcon={<MenuIcon size={20} />}
      />

      <Header.Brand sx={{ flexShrink: 0, mr: BRAND_CLEAR_SPACE }}>
        {/* The lockup is the way home, as it is in every other product.
            Deliberately a real link rather than an onClick, so cmd-click and
            middle-click open a new tab the way a logo is expected to.
            `Header.Brand` is not polymorphic, so the link nests inside it and
            reproduces the flex row its children were relying on.

            It goes to the LANDING path, not a hardcoded /me: that honours the
            per-user setting on /settings, and still lands on Me for anyone who
            has not changed it. Sending someone to Me when they have chosen a
            different home would contradict their own preference.

            aria-label because the only text inside is "One" and the mark is
            hidden from assistive tech — on its own that is a thin name for a
            link. */}
        <Box
          component={RouterLink}
          to={landingPath()}
          aria-label="One App home"
          sx={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
            color: "inherit",
            borderRadius: 1,
            "&:focus-visible": {
              outline: 2,
              outlineStyle: "solid",
              outlineColor: "primary.main",
              outlineOffset: 2,
            },
          }}
        >
          {/* The whole lockup is one line of text with the mark inline at its
              start, which is what lets BRAND_MARK_ALIGN centre the mark on the
              cap height. Overrides Oxygen's 16→18px app-name token, and its
              `display: none` below sm: the lockup stays whole on mobile.

              `lineHeight: 0` makes the line box exactly the mark's box, so the
              header centres the mark itself. With the theme's 1.6 the text's
              taller, baseline-weighted box set the height instead and the
              lockup sat low. "One" has no descenders and its caps stay inside
              the mark's height, so nothing renders outside it. */}
          <Header.BrandTitle
            sx={{
              display: "block",
              whiteSpace: "nowrap",
              fontFamily: BRAND_FONT_FAMILY,
              fontWeight: 600,
              // Repeated at sm: Oxygen sets its token in a sm-and-up media
              // rule, which a plain value here would lose to.
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
            One
          </Header.BrandTitle>
        </Box>
      </Header.Brand>

      {/* Palette trigger. A click target rather than a real input: the palette
          owns the query field.

          Fixed responsive widths rather than `flex: 1`, so the flexible slot
          belongs to PinnedTabs instead — the pinned strip is the part that
          benefits from spare room. It also narrows once anything is pinned,
          since the two share that row; at `xs` it collapses to an icon. */}
      <Box
        role="button"
        tabIndex={0}
        onClick={onOpenAsk}
        aria-label="Ask Novera"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenAsk();
          }
        }}
        sx={{
          flexShrink: 0,
          width: hasPinned
            ? { xs: 40, sm: 200, md: 260, lg: 320 }
            : { xs: 40, sm: 280, md: 400, lg: 520 },
          display: "flex",
          alignItems: "center",
          justifyContent: { xs: "center", sm: "flex-start" },
          gap: 1.25,
          bgcolor: "action.hover",
          border: 1,
          borderColor: "divider",
          borderRadius: 1.5,
          px: { xs: 0, sm: 1.75 },
          py: 0.75,
          color: "text.secondary",
          cursor: "text",
          transition: "border-color .15s, width .15s",
          "&:hover": { borderColor: "text.disabled" },
          "&:focus-visible": { outline: 2, outlineStyle: "solid", outlineColor: "primary.main" },
        }}
      >
        <SearchIcon size={16} style={{ flexShrink: 0 }} />
        {/* Names Novera deliberately: it is a committed part of the product, and
            the palette states plainly that the assistant is still coming rather
            than implying it already answers. */}
        <Typography variant="body2" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
          Ask Novera
        </Typography>
        <Box
          sx={{
            ml: "auto",
            display: { xs: "none", md: "block" },
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
            borderRadius: 0.75,
            px: 0.75,
            flexShrink: 0,
          }}
        >
          <Typography variant="caption">{SHORTCUT_HINT}</Typography>
        </Box>
      </Box>

      {/* Takes the flexible middle slot, collapsing to a plain spacer when
          nothing is pinned. */}
      <PinnedTabs />

      <Header.Actions>
        {/* Swag Store's shortcut, just left of the app switcher. Renders
            nothing while its preview flag is off. */}
        <StoreButton />
        <Tooltip title="Switch app">
          <IconButton
            onClick={(e) => onToggleWaffle(e.currentTarget)}
            size="small"
            aria-label="Switch app"
            data-tour="app-menu"
            aria-haspopup="dialog"
            aria-expanded={waffleOpen}
          >
            <AppsGridIcon size={20} />
          </IconButton>
        </Tooltip>
        <PinThisPageButton />
        {/* Palette, then light/dark within it — two separate choices, both
            persisted, deliberately adjacent. The tour treats them as one thing,
            so the marker sits on a wrapper rather than on either control. */}
        <Box sx={{ display: "flex", alignItems: "center" }} data-tour="theme">
          <ThemeSelect />
          {/* Oxygen's own 3-state cycle: light → dark → system. */}
          <ColorSchemeToggle size="small" />
        </Box>
        <UserProfileMenu />
      </Header.Actions>
    </Header>
  );
}
