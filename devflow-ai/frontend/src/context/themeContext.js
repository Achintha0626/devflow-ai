/**
 * themeContext.js
 *
 * Exports the ThemeContext object and useTheme hook.
 * Also runs the one-time anti-flash theme initialisation at module load.
 *
 * Kept in a plain .js file (no JSX, no component) so ThemeContext.jsx
 * can export only the ThemeProvider component and satisfy the
 * react-refresh/only-export-components ESLint rule.
 *
 * Theme-init priority:
 *   1. Previously saved value in localStorage ("devflow_theme")
 *   2. OS/browser prefers-color-scheme: light
 *   3. Default: "dark"
 *
 * The resolved theme is applied to document.documentElement as a
 * data-theme attribute immediately at module evaluation time, before the
 * first React render, preventing a visible flash of the wrong theme.
 */

import { createContext, useContext } from "react";

export const STORAGE_KEY = "devflow_theme";

/** Determine and apply the initial theme before React renders. */
function resolveInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // localStorage unavailable (e.g. restrictive private-browsing settings)
  }

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }

  return "dark";
}

// Run immediately at module evaluation so the attribute is set before paint.
export const initialTheme = resolveInitialTheme();
document.documentElement.setAttribute("data-theme", initialTheme);

export const ThemeContext = createContext(null);

/** Convenience hook — throws clearly if used outside <ThemeProvider>. */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a <ThemeProvider>.");
  return ctx;
}
