"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { homeCopy } from "@/lib/homeCopy";

/** Footer pubblico: dati societari, contatti e collegamenti, come il footer di core829.net. */
export function PublicFooter() {
  const { t, locale } = useTranslation();
  const c = homeCopy(locale);
  const link = "text-foreground-muted transition-colors duration-300 hover:text-accent";

  return (
    <footer className="border-t border-border bg-background">
      <div className="container-core829 grid grid-cols-1 gap-12 py-14 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5">
          <Image src="/brand/symbol-red.svg" alt="CORE829" width={83} height={56} unoptimized className="h-14 w-auto" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-foreground-muted">
            CORE829 SRL · {t("footer_agency")}
            <br />
            Str. Mihai Eminescu, 10, Roman, Romania
            <br />
            Reg. com.: J2026029428009 · CUI / CIF: 54616345
          </p>
        </div>
        <div className="md:col-span-3">
          <p className="tech-label">{c.navContact}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="mailto:hello@core829.net" className={link}>hello@core829.net</a></li>
            <li><a href="tel:+40766668482" className={link}>+40 766 668 482</a></li>
            <li><a href="tel:+393759468881" className={link}>+39 375 946 8881</a></li>
          </ul>
        </div>
        <div className="md:col-span-4">
          <p className="tech-label">CORE829</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="https://core829.net" className={link}>core829.net</a></li>
            <li><Link href="/#come-funziona" className={link}>{c.navHow}</Link></li>
            <li>
              <a href="https://www.trustpilot.com/review/core829.net" target="_blank" rel="noopener noreferrer" className={link}>
                {t("footer_reviews")}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="container-core829 py-5 text-xs text-foreground-muted">
          © {new Date().getFullYear()} CORE829 SRL. {t("footer_rights")}
        </p>
      </div>
    </footer>
  );
}
