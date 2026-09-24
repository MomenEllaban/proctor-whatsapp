"use client";

import { useEffect } from "react";

/** Registers the PWA service worker (prod only, HTTPS only). */
export function SwRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !window.isSecureContext
    ) {
      return;
    }
    const reg = navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline shell is a progressive enhancement */
    });
    return () => {
      reg.then((r) => r?.unregister()).catch(() => {});
    };
  }, []);
  return null;
}