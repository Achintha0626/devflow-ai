/**
 * ThemeContext.jsx
 *
 * Exports only the ThemeProvider component.
 * The ThemeContext object, useTheme hook, and init logic live in
 * themeContext.js so this file satisfies the
 * react-refresh/only-export-components ESLint rule.
 */

import { useCallback, useState } from "react";
import { ThemeContext, STORAGE_KEY, initialTheme } from "./themeContext";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore write failures
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
