export type Theme = "light" | "dark";

const STORAGE_KEY = "rhm-theme";

/** Reads the theme the user last picked, falling back to the OS preference. */
export function initialTheme(): Theme {
  const stored = safeRead();
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function safeRead(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeWrite(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage: theming still works for this session.
  }
}

export function initThemeToggle(): void {
  const button = document.querySelector<HTMLButtonElement>("#theme-toggle");
  if (!button) return;

  const root = document.documentElement;

  const apply = (theme: Theme, persist: boolean): void => {
    root.dataset.theme = theme;
    const next = theme === "dark" ? "light" : "dark";
    button.setAttribute("aria-label", `Switch to ${next} theme`);
    button.title = `Switch to ${next} theme`;
    if (persist) safeWrite(theme);
  };

  apply(initialTheme(), false);

  button.addEventListener("click", () => {
    apply(root.dataset.theme === "dark" ? "light" : "dark", true);
  });
}
