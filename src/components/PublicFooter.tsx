"use client";

import Badge from "@/components/ui/Badge";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export function PublicFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto w-full max-w-container px-6 py-12 sm:px-12 lg:px-20">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <Badge tone="outline">CORE829 SRL</Badge>
            <p className="mt-3 text-sm text-foreground-muted">
              {t("footer_agency")}
              <br />
              Str. Mihai Eminescu, 10, Roman, Romania
              <br />
              Reg. com.: J2026029428009
              <br />
              CUI / CIF: 54616345
            </p>
          </div>
          <div className="text-sm text-foreground-muted">
            <p>
              <a href="tel:+40766668482" className="link-ghost">
                +40 766 668 482
              </a>
            </p>
            <p className="mt-2">
              <a href="mailto:hello@core829.net" className="link-ghost">
                hello@core829.net
              </a>
            </p>
            <p className="mt-2">
              <a
                href="https://www.trustpilot.com/review/core829.net"
                target="_blank"
                rel="noopener noreferrer"
                className="link-ghost"
              >
                {t("footer_reviews")}
              </a>
            </p>
          </div>
        </div>
        <p className="mt-10 text-xs text-foreground-muted">
          © {new Date().getFullYear()} CORE829 SRL. {t("footer_rights")}
        </p>
      </div>
    </footer>
  );
}
