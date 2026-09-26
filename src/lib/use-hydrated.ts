"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False while rendering on the server and on the very first client render, true
 * from the second render on. Use it for values that depend on the client's clock
 * or locale, so the server markup and the first client render stay identical.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
