"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  window.addEventListener("themechange", callback);
  return () => window.removeEventListener("themechange", callback);
}

function getTheme(): string {
  return document.documentElement.getAttribute("data-theme") || "light";
}

function getServerTheme(): string {
  return "light";
}

/** Synchronizes the toggle with the theme script without a hydration mismatch. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute("content", next === "dark" ? "#0a3d36" : "#075e54"));
    window.dispatchEvent(new Event("themechange"));
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore storage failures */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="icon-btn"
      aria-label={theme === "dark" ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"}
      title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-14a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 15a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1ZM4.2 4.2a1 1 0 0 1 1.4 0l.7.7a1 1 0 1 1-1.4 1.4l-.7-.7a1 1 0 0 1 0-1.4Zm13.4 13.4a1 1 0 0 1 1.4 0l.7.7a1 1 0 1 1-1.4 1.4l-.7-.7a1 1 0 0 1 0-1.4ZM4 12a1 1 0 0 1 1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm18 0a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM4.2 19.8a1 1 0 0 1 0-1.4l.7-.7a1 1 0 1 1 1.4 1.4l-.7.7a1 1 0 0 1-1.4 0Zm13.4-13.4a1 1 0 0 1 0 1.4l-.7.7a1 1 0 1 1-1.4-1.4l.7-.7a1 1 0 0 1 1.4 0Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M21.5 14.5A9.4 9.4 0 0 1 9.5 2.5a9 9 0 1 0 12 12Z" />
        </svg>
      )}
    </button>
  );
}
