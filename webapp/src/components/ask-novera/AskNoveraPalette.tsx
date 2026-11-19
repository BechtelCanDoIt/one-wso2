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
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  Header,
  IconButton,
  InputBase,
  Typography,
} from "@wso2/oxygen-ui";
import {
  ExternalLinkIcon,
  SearchIcon,
  XIcon,
} from "@wso2/oxygen-ui-icons-react";
import BrandLockup from "@components/top-bar/BrandLockup";
import { visuallyHidden } from "@utils/visuallyHidden";
import { useEffect, useMemo, useRef, useState, type FormEvent, type JSX } from "react";
import { useNavigate } from "react-router";
import type { Capability } from "@constants/appMenu";
import { PIN_KIND_META } from "@features/pinned/pinKinds";
import { usePinnedEntries } from "@features/pinned/usePinned";
import { searchDirectories } from "./directoryCatalog";

const CANVAS_COLUMN_MAX_WIDTH = 680;

/**
 * Props for the AskNoveraPalette overlay component.
 */
export interface AskNoveraPaletteProps {
  /** Anchor element for focus restoration when closing */
  anchorEl?: HTMLElement | null;
  /** Close callback when user clicks back/close or presses Escape */
  onClose: () => void;
  /** Initial search query passed from TopBar */
  initialQuery?: string;
  /** Optional user capabilities for role-based catalog filtering */
  userCaps?: Set<Capability>;
}

/**
 * Full-screen search overlay palette for app discovery and direct route navigation.
 *
 * Implements the full-screen canvas takeover layout:
 * 1. Sticky top navigation bar: symmetrically centered search bar, brand back button, and ESC exit.
 * 2. Centered content column: Best match action card with deep keyword search; pressing Enter opens the match.
 * 3. Pinned page shortcuts when query is empty. Changes to initialQuery replace the canvas query.
 */
export default function AskNoveraPalette({
  anchorEl,
  onClose,
  initialQuery = "",
  userCaps,
}: AskNoveraPaletteProps): JSX.Element {
  const navigate = useNavigate();
  const pinned = usePinnedEntries();
  const canvasInputRef = useRef<HTMLInputElement>(null);
  const scrollStageRef = useRef<HTMLDivElement>(null);

  const [canvasQuery, setCanvasQuery] = useState(initialQuery);
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);

  if (prevInitialQuery !== initialQuery) {
    setPrevInitialQuery(initialQuery);
    setCanvasQuery(initialQuery);
  }

  // Move focus into search input on mount
  useEffect(() => {
    canvasInputRef.current?.focus();
  }, []);

  // Restore focus to anchor element on close (or mobile trigger if desktop search was hidden on resize)
  useEffect(() => {
    return () => {
      const input = anchorEl?.querySelector<HTMLElement>("input");
      if (input && input.getClientRects().length > 0) {
        input.focus();
      } else if (anchorEl && anchorEl.getClientRects().length > 0) {
        anchorEl.focus();
      } else {
        document.querySelector<HTMLElement>('button[aria-label="Ask Novera"]')?.focus();
      }
    };
  }, [anchorEl]);

  const handleClear = (): void => {
    setCanvasQuery("");
    canvasInputRef.current?.focus();
  };

  const handleOpenApp = (href: string, isExternal?: boolean): void => {
    if (isExternal || href.startsWith("http://") || href.startsWith("https://")) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      navigate(href);
    }
    onClose();
  };

  // Direct search matches
  const searchResults = useMemo(() => {
    const trimmed = canvasQuery.trim();
    if (!trimmed) {
      return [];
    }
    return searchDirectories(trimmed, userCaps);
  }, [canvasQuery, userCaps]);

  // Primary app: top scored search result (Best Match)
  const primaryApp = searchResults.length > 0 ? searchResults[0] : null;

  const handleCanvasSearchSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (primaryApp) {
      handleOpenApp(primaryApp.href, primaryApp.isExternal);
    }
  };

  return (
    <Dialog
      fullScreen
      open
      onClose={onClose}
      aria-labelledby="ask-novera-palette-title"
      transitionDuration={0}
      // Full-screen canvas takeover: strip Oxygen's floating dialog paper styling (acrylic blur and
      // elevation gradient) so the canvas acts as an opaque, high-performance solid page view.
      slotProps={{
        paper: {
          sx: {
            bgcolor: "background.default",
            backgroundColor: "var(--oxygen-palette-background-default)",
            backdropFilter: "none",
            backgroundImage: "none",
            color: "text.primary",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        },
      }}
    >
      {/* Visually hidden heading giving the search dialog an accessible name */}
      <Typography id="ask-novera-palette-title" sx={visuallyHidden}>
        Ask Novera app search
      </Typography>

      {/* Sticky Top Bar: Symmetric flanks with perfectly centered search bar */}
      <Box
        sx={{
          minHeight: 64,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.default",
          backgroundColor: "var(--oxygen-palette-background-default)",
          backdropFilter: "none",
          backgroundImage: "none",
          px: { xs: 2, sm: 3 },
          display: "flex",
          alignItems: "center",
          gap: { xs: 1.5, sm: 2 },
          flexShrink: 0,
          boxShadow: (t) =>
            `0 1px 3px ${alpha(t.palette.common.black, t.palette.mode === "dark" ? 0.4 : 0.05)}`,
        }}
      >
        {/* Left Flank: Brand lockup acts as back button */}
        <Box
          sx={{
            width: { xs: "auto", sm: 140, md: 160 },
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <Header.Brand sx={{ flexShrink: 0, m: 0 }}>
            <Box
              component="button"
              type="button"
              onClick={onClose}
              aria-label="Close search"
              sx={{
                background: "none",
                border: "none",
                p: 0,
                m: 0,
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
                borderRadius: 1,
                flexShrink: 0,
                "&:hover": { opacity: 0.85 },
                "&:focus-visible": {
                  outline: 2,
                  outlineStyle: "solid",
                  outlineColor: "primary.main",
                  outlineOffset: 2,
                },
              }}
            >
              <BrandLockup />
            </Box>
          </Header.Brand>
        </Box>

        {/* Center Column: Symmetrically centered search bar */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          {/* Hand-built search field using InputBase to match TopBar's compact pill styling,
              focus ring, and dynamic clear button, which Oxygen's rigid 40px SearchBar cannot accommodate. */}
          <Box
            component="form"
            onSubmit={handleCanvasSearchSubmit}
            sx={{
              width: "100%",
              maxWidth: CANVAS_COLUMN_MAX_WIDTH,
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              bgcolor: "action.hover",
              border: 1,
              borderColor: "primary.main",
              borderRadius: 1.5,
              px: 1.75,
              py: 0.5,
              boxShadow: (t) =>
                `0 0 0 1px ${
                  t.vars
                    ? `rgba(${t.vars.palette.primary.mainChannel} / ${
                        t.palette.mode === "dark" ? 0.45 : 0.25
                      })`
                    : alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.45 : 0.25)
                }`,
            }}
          >
            <SearchIcon size={16} style={{ flexShrink: 0 }} />
            <InputBase
              inputRef={canvasInputRef}
              value={canvasQuery}
              onChange={(e) => {
                setCanvasQuery(e.target.value);
              }}
              placeholder="Search apps by name, description, or keyword..."
              inputProps={{ "aria-label": "Search query" }}
              sx={{
                flex: 1,
                fontSize: 13.5,
                color: "text.primary",
                "& input": { p: 0 },
              }}
            />
            {canvasQuery ? (
              <IconButton
                size="small"
                onClick={handleClear}
                aria-label="Clear query"
                sx={{ p: 0.25, color: "text.secondary" }}
              >
                <XIcon size={14} />
              </IconButton>
            ) : null}
          </Box>
        </Box>

        {/* Right Flank: ESC exit shortcut indicator */}
        <Box
          sx={{
            width: { xs: "auto", sm: 140, md: 160 },
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={onClose}
            aria-label="Close search (Esc)"
            sx={{
              cursor: "pointer",
              bgcolor: "action.hover",
              border: 1,
              borderColor: "divider",
              borderRadius: 0.75,
              px: 1.25,
              py: 0.5,
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              justifyContent: "center",
              "&:hover": { borderColor: "text.disabled" },
              "&:focus-visible": { outline: 2, outlineStyle: "solid", outlineColor: "primary.main" },
            }}
          >
            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary" }}>
              ESC
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Scrollable Stage: centered content column */}
      <Box
        ref={scrollStageRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          scrollBehavior: "smooth",
          px: { xs: 2, sm: 3, md: 4 },
          py: 2.5,
        }}
      >
        <Box
          sx={{
            maxWidth: CANVAS_COLUMN_MAX_WIDTH,
            width: "100%",
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          {/* Text Search: Best Match Action Button Card */}
          {primaryApp && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography
                variant="overline"
                sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: 0.5 }}
              >
                Best Match
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  p: 2,
                  borderRadius: 1,
                  bgcolor: (t) =>
                    t.vars
                      ? `rgba(${t.vars.palette.primary.mainChannel} / ${
                          t.palette.mode === "dark" ? 0.08 : 0.04
                        })`
                      : alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.08 : 0.04),
                  border: 1,
                  borderColor: (t) =>
                    t.vars
                      ? `rgba(${t.vars.palette.primary.mainChannel} / ${
                          t.palette.mode === "dark" ? 0.25 : 0.15
                        })`
                      : alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.25 : 0.15),
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, minWidth: 0, flex: 1 }}>
                  <Box
                    sx={{
                      display: "grid",
                      placeItems: "center",
                      width: 40,
                      height: 40,
                      borderRadius: 0.75,
                      flexShrink: 0,
                      bgcolor: (t) =>
                        t.vars
                          ? `rgba(${t.vars.palette.primary.mainChannel} / ${
                              t.palette.mode === "dark" ? 0.2 : 0.1
                            })`
                          : alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.2 : 0.1),
                      color: "primary.main",
                    }}
                  >
                    <primaryApp.icon size={20} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25, flexWrap: "wrap" }}>
                      <Typography
                        sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: "text.primary" }}
                      >
                        {primaryApp.title}
                      </Typography>
                      <Chip
                        label={primaryApp.category}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 11,
                          fontWeight: 500,
                          borderRadius: 0.5,
                          bgcolor: (t) =>
                            t.vars
                              ? `rgba(${t.vars.palette.primary.mainChannel} / ${
                                  t.palette.mode === "dark" ? 0.15 : 0.08
                                })`
                              : alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.15 : 0.08),
                          color: "primary.main",
                        }}
                      />
                      {primaryApp.tags.slice(0, 2).map((tag) => (
                        <Typography
                          key={tag}
                          variant="caption"
                          sx={{ fontSize: 11, color: "text.disabled" }}
                        >
                          #{tag}
                        </Typography>
                      ))}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.35 }}
                    >
                      {primaryApp.hint}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    handleOpenApp(primaryApp.href, primaryApp.isExternal);
                  }}
                  endIcon={<ExternalLinkIcon size={14} style={{ display: "block" }} />}
                  sx={{
                    borderRadius: 1,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: 13,
                    px: 2,
                    py: 0.75,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1.3,
                    boxShadow: "none",
                    "& .MuiButton-endIcon": { ml: 0.75, mr: 0, display: "inline-flex", alignItems: "center" },
                  }}
                >
                  {primaryApp.label}
                </Button>
              </Box>
            </Box>
          )}

          {/* Pinned Pages (when search query is empty) */}
          {!canvasQuery.trim() && pinned.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              <Typography
                variant="overline"
                sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: 0.5 }}
              >
                Pinned Pages
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {pinned.map((entry) => {
                  const Icon = PIN_KIND_META[entry.kind].icon;
                  return (
                    <Button
                      key={`${entry.kind}-${entry.id}`}
                      variant="outlined"
                      size="small"
                      startIcon={<Icon size={14} />}
                      onClick={() => {
                        handleOpenApp(entry.href, false);
                      }}
                      sx={{
                        borderRadius: 1,
                        textTransform: "none",
                        fontSize: 12.5,
                        color: "text.primary",
                        borderColor: "divider",
                        "&:hover": { borderColor: "primary.main" },
                      }}
                    >
                      {entry.label}
                    </Button>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Empty Search State */}
          {canvasQuery.trim() && !primaryApp && (
            <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                No apps found matching &ldquo;{canvasQuery}&rdquo;
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}
