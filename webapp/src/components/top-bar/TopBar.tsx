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

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type JSX,
} from "react";
import {
  alpha,
  Box,
  ColorSchemeToggle,
  Header,
  IconButton,
  InputBase,
  Tooltip,
  Typography,
  useTheme,
} from "@wso2/oxygen-ui";
import { MenuIcon, SearchIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import AppsGridIcon from "./AppsGridIcon";
import BrandLockup, { BRAND_CLEAR_SPACE } from "./BrandLockup";
import { Link as RouterLink } from "react-router";
import { landingPath } from "@config/landingConfig";
import PinnedTabs from "@features/pinned/components/PinnedTabs";
import PinThisPageButton from "@features/pinned/components/PinThisPageButton";
import StoreButton from "@features/swag-store/components/StoreButton";
import { usePinnedEntries } from "@features/pinned/usePinned";
import { useUserInfo } from "@api/useUserInfo";
import { capabilitiesFromPrivileges } from "@constants/appMenu";
import AskNoveraPalette from "@components/ask-novera/AskNoveraPalette";
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

interface TopBarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  /** Receives the button element, so the launcher can hang off it. */
  onToggleWaffle: (anchor: HTMLElement) => void;
  /** Whether the launcher is currently showing, for aria-expanded. */
  waffleOpen: boolean;
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
}: TopBarProps): JSX.Element {
  // Only the count matters here — the strip itself renders the entries.
  const hasPinned = usePinnedEntries().length > 0;
  const userInfo = useUserInfo();
  const userCaps = useMemo(
    () => capabilitiesFromPrivileges(userInfo.data?.privileges),
    [userInfo.data?.privileges],
  );
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [resultsOpen, setResultsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [pillEl, setPillEl] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = inputRef.current;
        const isHidden =
          window.innerWidth < theme.breakpoints.values.sm ||
          !input ||
          (typeof input.checkVisibility === "function" && !input.checkVisibility());
        if (isHidden) {
          setResultsOpen(true);
        } else {
          input.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [theme.breakpoints.values.sm]);

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setResultsOpen(true);
  };

  const handleClear = (): void => {
    setSearchQuery("");
    setResultsOpen(false);
    inputRef.current?.focus();
  };

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
          {/* The brand lockup with ChoreoLabsMark and "One" wordmark in Sora. */}
          <BrandLockup />
        </Box>
      </Header.Brand>

      <Box sx={{ flexGrow: 1, minWidth: 0 }} />

      <IconButton
        size="small"
        onClick={() => setResultsOpen(true)}
        aria-label="Ask Novera"
        sx={{
          display: { xs: "inline-flex", sm: "none" },
          color: "text.secondary",
          p: 1,
        }}
      >
        <SearchIcon size={18} />
      </IconButton>

      {/* Hand-built search pill using InputBase rather than Oxygen's SearchBar:
          Oxygen's SearchBar wraps a standard 40px OutlinedInput with rigid padding and fixed
          startAdornment. The TopBar search pill needs a compact 32px height, form-level submit
          handling, custom focus-ring glowing around the entire pill, and dynamic right-side
          swapping between the shortcut badge (⌘K) and clear button. */}
          <Box
            ref={setPillEl}
            component="form"
            onSubmit={handleSearchSubmit}
            onClick={() => inputRef.current?.focus()}
            sx={{
              display: { xs: "none", sm: "flex" },
              cursor: "text",
              flexShrink: 0,
              width: hasPinned
                ? { sm: 200, md: 260, lg: 320 }
                : { sm: 280, md: 400, lg: 640 },
              alignItems: "center",
              gap: 1.25,
              bgcolor: "action.hover",
              border: 1,
              borderColor: isFocused ? "primary.main" : "divider",
              borderRadius: 1.5,
              px: 1.75,
              py: 0.5,
              color: "text.secondary",
              transition: "border-color .15s, width .15s, box-shadow .15s",
              boxShadow: isFocused
                ? (t) =>
                    `0 0 0 1px ${
                      t.vars
                        ? `rgba(${t.vars.palette.primary.mainChannel} / ${t.palette.mode === "dark" ? 0.45 : 0.25})`
                        : alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.45 : 0.25)
                    }`
                : "none",
              "&:hover": { borderColor: isFocused ? "primary.main" : "text.disabled" },
            }}
          >
            <SearchIcon size={16} style={{ flexShrink: 0 }} />
            <InputBase
              inputRef={inputRef}
              placeholder="Ask Novera"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && !e.nativeEvent.isComposing) {
                  setSearchQuery("");
                  setResultsOpen(false);
                  inputRef.current?.blur();
                }
              }}
              inputProps={{ "aria-label": "Ask Novera" }}
              sx={{
                flex: 1,
                fontSize: 13.5,
                color: "text.primary",
                "& input": { p: 0 },
              }}
            />

            {searchQuery ? (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                aria-label="Clear search"
                sx={{ p: 0.25, color: "text.secondary" }}
              >
                <XIcon size={14} />
              </IconButton>
            ) : (
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
            )}
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

      {/* Full-Screen Search Canvas Overlay */}
      {resultsOpen && (
        <AskNoveraPalette
          anchorEl={pillEl}
          onClose={() => setResultsOpen(false)}
          initialQuery={searchQuery}
          userCaps={userCaps}
        />
      )}
    </Header>
  );
}
