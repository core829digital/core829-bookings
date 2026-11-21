"use client";

import Image from "next/image";
import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { buttonClasses } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { homeCopy } from "@/lib/homeCopy";

/**
 * Header pubblico: capsula Bianco Polare con il simbolo in Rosso Racing (Brand Guidelines, applicazioni),
 * stessa struttura della barra di core829.net. Le ancore puntano alla home.
 */
export function PublicHeader() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { t, locale } = useTranslation();
  const c = homeCopy(locale);
  const link =
    "hidden min-h-11 items-center whitespace-nowrap rounded-full px-3 font-mono text-[10px] uppercase tracking-[0.08em] text-foreground-muted transition-colors duration-300 hover:text-accent md:inline-flex";

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="glass-bar mx-auto flex max-w-[90rem] items-center justify-between gap-3 rounded-full py-1.5 pl-4 pr-1.5 sm:pl-5">
        <Link href="/" aria-label="CORE829 Bookings" className="flex min-h-11 items-center gap-3">
          <Image src="/brand/symbol-red.svg" alt="CORE829" width={44} height={30} priority unoptimized className="h-7 w-auto" />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-foreground-muted sm:inline">
            Bookings
          </span>
        </Link>
        <nav className="flex items-center" aria-label="Main">
          <Link href="/#come-funziona" className={link}>{c.navHow}</Link>
          <Link href="/#sito" className={link}>{c.navSite}</Link>
          <Link href="/#contatti" className={link}>{c.navContact}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {!isLoading && (
            <Link
              href={isAuthenticated ? "/calendar" : "/signin"}
              className={buttonClasses("secondary", "hidden !px-4 text-xs sm:inline-flex")}
            >
              {isAuthenticated ? t("nav_dashboard") : t("nav_signin")}
            </Link>
          )}
          <Link href="/#prenota" className={buttonClasses("primary", "!px-4 text-xs sm:!px-5")}>
            {c.book}
          </Link>
        </div>
      </div>
    </header>
  );
}
