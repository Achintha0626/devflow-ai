/**
 * ThemeToggle.jsx
 *
 * Small button that switches between light and dark themes.
 * Uses Unicode sun/moon symbols — no icon library required.
 * Consumes ThemeContext via useTheme().
 */

import { useTheme } from "../context/themeContext";
import "./ThemeToggle.css";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle"
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
