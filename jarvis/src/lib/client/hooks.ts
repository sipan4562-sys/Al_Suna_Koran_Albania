"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => undefined;

/**
 * Liest einen Wert, der nur im Browser existiert (Uhrzeit, Storage …), ohne
 * Hydration-Abweichung: Auf dem Server und beim Hydrieren gilt `serverValue`.
 * `read` muss bei gleichem Zustand denselben Wert liefern (Object.is).
 */
export function useClientValue<T>(read: () => T, serverValue: T, subscribe = noopSubscribe): T {
  return useSyncExternalStore(subscribe, read, () => serverValue);
}

const secondTicker = (callback: () => void) => {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
};

/** Aktuelle Zeit in Sekunden (aktualisiert sich sekündlich), auf dem Server `null`. */
export function useNowSeconds(): number | null {
  return useSyncExternalStore(secondTicker, () => Math.floor(Date.now() / 1000), () => null);
}
