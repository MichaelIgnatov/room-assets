import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Читаем сохраненную тему из localStorage, чтобы настройки не слетали при перезагрузке
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem("theme_mode") as ThemeMode) || "system";
  });

  const [isSystemDark, setIsSystemDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("theme_mode", themeMode);
  }, [themeMode]);

  // Слушаем изменение системной темы (если пользователь переключил тему в Windows/macOS)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setIsSystemDark(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  // Определяем, какой режим сейчас активен
  const isDark = themeMode === "dark" || (themeMode === "system" && isSystemDark);

  // Конфигурируем палитру MUI для светлого и темного режимов
  const theme = createTheme({
    palette: {
      mode: isDark ? "dark" : "light",
      primary: {
        main: "#aa3bff", // Ваш фиолетовый бренд-цвет из аватара
      },
      background: {
        default: isDark ? "#121212" : "#f5f7fa",
        paper: isDark ? "#1e1e1e" : "#ffffff",
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode }}>
      <MuiThemeProvider theme={theme}>
        {/* CssBaseline автоматически перекрашивает фон тега body в зависимости от темы */}
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme должен использоваться внутри ThemeProvider");
  }
  return context;
}
