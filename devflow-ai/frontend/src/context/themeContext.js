import { createContext, useContext } from "react";

export const STORAGE_KEY = "devflow_theme";

function getSystemTheme() {
  if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

function resolveInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    return getSystemTheme();
  }

  return getSystemTheme();
}

export const initialTheme = resolveInitialTheme();
document.documentElement.setAttribute("data-theme", initialTheme);

export const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a <ThemeProvider>.");
  return ctx;
}
