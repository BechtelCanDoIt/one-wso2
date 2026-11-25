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

// Paints the page in the theme's background before the React bundle loads.
//
// Until React mounts, Oxygen's CssBaseline has not set the body background,
// so the browser paints its default white. In dark mode that is a white flash
// on every full page load — the first visit and again on the return from the
// Asgardeo sign-in redirect. MUI's InitColorSchemeScript solves this with an
// inline script, which the production CSP (script-src 'self') blocks, so this
// runs as a same-origin file instead, loaded synchronously from index.html.
//
// It mirrors what the app resolves at runtime: the light/dark mode MUI keeps
// under "mui-mode", and the palette key ThemePreferenceContext keeps under
// "one-wso2.theme" (default window.config.ONE_WSO2_THEME, then "choreoLabs").
// The colours are each Oxygen theme's palette.background.default; if they
// drift, the cost is a brief shade change, not a white flash.
//
// It also sets the default mode, dark. MUI's own default is "system", and
// Oxygen's provider passes no other, so when nothing is saved yet this saves
// "dark" before MUI reads the key. The toggle overwrites it with the person's
// own choice — light, dark or system — which is then kept as before.
(function () {
  var BACKGROUNDS = {
    choreoLabs: { light: "#f4f6fa", dark: "#050a1c" },
    wso2: { light: "#ffffff", dark: "#0b142b" },
    acrylicOrange: { light: "#f5f5f5", dark: "#000000" },
    oneWso2: { light: "#f5f5f5", dark: "#000000" },
    acrylicPurple: { light: "#f5f5f5", dark: "#000000" },
    classic: { light: "#fafafa", dark: "#121212" },
    highContrast: { light: "#ffffff", dark: "#000000" },
    paleIndigo: { light: "#f5f5f5", dark: "#121212" },
    paleGray: { light: "#f5f5f5", dark: "#121212" },
  };

  function read(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      // Disabled storage: fall back to the defaults below.
      return null;
    }
  }

  var mode = read("mui-mode");
  if (mode !== "light" && mode !== "dark" && mode !== "system") {
    mode = "dark";
    try {
      window.localStorage.setItem("mui-mode", mode);
    } catch (e) {
      // Disabled storage: this load still paints dark, but MUI falls back to
      // its own "system" default once it mounts.
    }
  }
  if (mode === "system") {
    mode =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  }

  var themeKey = read("one-wso2.theme");
  if (!Object.prototype.hasOwnProperty.call(BACKGROUNDS, themeKey)) {
    var configured = window.config && window.config.ONE_WSO2_THEME;
    themeKey = Object.prototype.hasOwnProperty.call(BACKGROUNDS, configured) ? configured : "choreoLabs";
  }

  var root = document.documentElement;
  // The same attribute MUI sets on mount (Oxygen's colorSchemeSelector), so
  // the first React render finds the scheme already in place.
  root.setAttribute("data-color-scheme", mode);
  // Through the theme's own variable, with this file's colour only as the
  // fallback until Oxygen defines it: a fixed colour here would outlive a
  // theme or mode switch at runtime and show behind short pages.
  root.style.backgroundColor =
    "var(--oxygen-palette-background-default, " + BACKGROUNDS[themeKey][mode] + ")";
})();
