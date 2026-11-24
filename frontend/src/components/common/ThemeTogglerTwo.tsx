import { Moon, Sun } from "lucide-react";

import { useTheme } from "../../context/ThemeContext";

export default function ThemeTogglerTwo() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-line bg-surface text-fg-muted transition-colors duration-150 hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      {isDark ? (
        <Sun aria-hidden="true" className="h-4 w-4" />
      ) : (
        <Moon aria-hidden="true" className="h-4 w-4" />
      )}
    </button>
  );
}
