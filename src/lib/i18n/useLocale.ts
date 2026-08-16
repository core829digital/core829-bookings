"use client";

import { useCallback, useSyncExternalStore } from "react";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "./translations";

const STORAGE_KEY = "core829-locale";
const listeners = new Set<() => void>();

function detectBrowserLocale(): Locale {
  for (const lang of navigator.languages ?? [navigator.language]) {
    const code = lang.slice(0, 2).toLowerCase();
    if ((LOCALES as readonly string[]).includes(code)) return code as Locale;
  }
  return DEFAULT_LOCALE;
}

function getSnapshot(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (LOCALES as readonly string[]).includes(stored)) return stored as Locale;
  return detectBrowserLocale();
}

// SSR renders in Italian (this app's native language); the client then
// syncs to the visitor's stored/detected locale on mount via
// useSyncExternalStore — the React-recommended way to read external browser
// state (localStorage/navigator) without the extra-render "setState in a
// useEffect" pattern.
function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function useLocale(): [Locale, (locale: Locale) => void] {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next);
    listeners.forEach((notify) => notify());
  }, []);

  return [locale, setLocale];
}
