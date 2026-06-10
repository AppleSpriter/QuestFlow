export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "questflow-theme";
const THEME_SYSTEM_CHECK_KEY = "questflow-theme-system-check-date";
const THEME_CHANGE_EVENT = "questflow-theme-change";

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const isThemeMode = (value: string | null): value is ThemeMode => value === "light" || value === "dark";

export const getStoredTheme = (): ThemeMode | null => {
  if (typeof window === "undefined") return null;
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(storedTheme) ? storedTheme : null;
};

export const getSystemTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const applyTheme = (theme: ThemeMode) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
};

export const resolveInitialTheme = (): ThemeMode => getStoredTheme() ?? getSystemTheme();

export const syncThemeWithSystemOncePerDay = (): ThemeMode => {
  if (typeof window === "undefined") return "light";

  const todayKey = getTodayKey();
  const lastCheckDate = window.localStorage.getItem(THEME_SYSTEM_CHECK_KEY);
  const shouldCheckSystem = lastCheckDate !== todayKey;
  const storedTheme = getStoredTheme();
  const systemTheme = shouldCheckSystem ? getSystemTheme() : null;
  const nextTheme = shouldCheckSystem && systemTheme === "dark" && storedTheme !== "dark"
    ? "dark"
    : storedTheme ?? systemTheme ?? "light";

  if (shouldCheckSystem) {
    window.localStorage.setItem(THEME_SYSTEM_CHECK_KEY, todayKey);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  applyTheme(nextTheme);
  return nextTheme;
};

export const setStoredTheme = (theme: ThemeMode) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_CHANGE_EVENT, { detail: theme }));
  }
  applyTheme(theme);
};

export const subscribeThemeChange = (onChange: (theme: ThemeMode) => void) => {
  if (typeof window === "undefined") return () => undefined;

  const handleThemeChange = (event: Event) => {
    onChange((event as CustomEvent<ThemeMode>).detail);
  };
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
};
