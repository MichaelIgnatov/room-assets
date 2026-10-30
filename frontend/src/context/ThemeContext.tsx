import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline, GlobalStyles } from "@mui/material";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "theme_mode";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const PRIMARY_LIGHT = "#1d4ed8";
const PRIMARY_DARK = "#aa3bff";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isThemeMode(raw)) return raw;
  } catch {
  }
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(readStoredMode);
  const [isSystemDark, setIsSystemDark] = useState<boolean>(() => window.matchMedia(DARK_QUERY).matches);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, themeMode);
    } catch {
    }
  }, [themeMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_QUERY);
    const handleChange = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const isDark = themeMode === "dark" || (themeMode === "system" && isSystemDark);

  const primaryMain = isDark ? PRIMARY_DARK : PRIMARY_LIGHT;

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDark ? "dark" : "light",
          primary: { main: primaryMain },
          background: {
            default: isDark ? "#121212" : "#f5f7fa",
            paper: isDark ? "#1e1e1e" : "#ffffff",
          },
        },
        components: {
          MuiButton: { styleOverrides: { root: { borderRadius: 8 } } },
          MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
        },
      }),
    [isDark, primaryMain]
  );

  const value = useMemo<ThemeContextType>(() => ({ themeMode, setThemeMode }), [themeMode]);

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        <GlobalStyles styles={{ ":root": { "--app-primary": primaryMain } }} />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme должен использоваться внутри ThemeProvider");
  }
  return context;
}
