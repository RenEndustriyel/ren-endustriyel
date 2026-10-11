"use client";

import * as React from "react";
import { useLocalStorage, useIsClient } from "@/lib/use-local-storage";

export type Theme = "light" | "dark" | "system";
const KEY = "ren-theme";

/** <head> içinde çalışır; sayfa boyanmadan önce temayı uygular (beyaz parlama olmaz). */
export const themeScript = `(function(){try{var t=localStorage.getItem('${KEY}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

const ThemeContext = React.createContext<{ theme: Theme; setTheme: (t: Theme) => void; resolved: "light" | "dark" }>({
  theme: "system",
  setTheme: () => {},
  resolved: "light",
});

function useSystemDark() {
  return React.useSyncExternalStore(
    (cb) => {
      const mq = matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useLocalStorage(KEY);
  const systemDark = useSystemDark();
  const isClient = useIsClient();
  const theme = (stored as Theme | null) ?? "system";
  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  React.useEffect(() => {
    if (!isClient) return; // hidrasyon öncesi <head> betiğinin uyguladığı temayı ezme
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#16181c" : "#2c3036");
  }, [resolved, isClient]);

  const setTheme = React.useCallback((t: Theme) => setStored(t), [setStored]);

  return <ThemeContext.Provider value={{ theme, setTheme, resolved }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => React.useContext(ThemeContext);
