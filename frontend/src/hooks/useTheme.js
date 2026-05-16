/**
 * useTheme.js — dark/light mode hook
 * Priority: saved preference → system preference
 * Writes data-theme to <html>
 */
import { useState, useEffect } from "react";

const KEY = "knfc-theme";

export default function useTheme() {
  const [theme, set] = useState(() => {
    const s = localStorage.getItem(KEY);
    if (s === "dark" || s === "light") return s;
    return window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme:dark)");
    const h  = e => { if (!localStorage.getItem(KEY)) set(e.matches ? "dark" : "light"); };
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  return {
    theme,
    isDark:  theme === "dark",
    toggle:  () => set(t => t === "dark" ? "light" : "dark"),
    setDark:  () => set("dark"),
    setLight: () => set("light"),
  };
}
