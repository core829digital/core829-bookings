"use client";

import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { LOCALES, type Locale } from "@/lib/i18n/translations";

const LOCALE_LABELS: Record<Locale, string> = {
  bg: "БГ", cs: "CS", da: "DA", de: "DE", el: "EL", en: "EN", es: "ES",
  fi: "FI", fr: "FR", hu: "HU", it: "IT", ja: "日本語", ko: "한국어",
  nl: "NL", no: "NO", pl: "PL", pt: "PT", ro: "RO", ru: "RU", sk: "SK",
  sv: "SV", tr: "TR", uk: "UK", zh: "中文",
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label="Lingua"
      className="border border-border bg-background px-2 py-1.5 text-xs text-foreground-muted hover:text-foreground"
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
