"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useLocale } from "./useLocale";
import { LOCALES, t as translate, type Locale } from "./translations";
import type { TRANSLATIONS } from "./translations";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof typeof TRANSLATIONS) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useLocale();

  // Embedders (e.g. core829.net) pass their own language once via ?lang=xx so the
  // widget matches the surrounding page instead of the visitor's browser language.
  // An unknown value is ignored. The choice is stored like a manual language pick.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search)
      .get("lang")
      ?.slice(0, 2)
      .toLowerCase();
    if (requested && (LOCALES as readonly string[]).includes(requested)) {
      setLocale(requested as Locale);
    }
  }, [setLocale]);
  const value: LocaleContextValue = {
    locale,
    setLocale,
    t: (key) => translate(locale, key),
  };
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// Falls back to Italian (this app's native language) if used outside the
// provider, rather than crashing — keeps team-dashboard pages (which don't
// need translation) free to skip wrapping in LocaleProvider.
export function useTranslation() {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return { locale: "it" as Locale, setLocale: () => {}, t: (key: keyof typeof TRANSLATIONS) => translate("it", key) };
}
