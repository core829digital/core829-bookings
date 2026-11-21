"use client";

import { GlassScene } from "@/components/ui/LiquidGlass";
import {  GLASS  } from "@/lib/glass";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useConvexAuth } from "convex/react";
import { Phone, Mail, ArrowRight, Calendar, Globe, Bell, Link2, Webhook, LayoutTemplate, Clock } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { buttonClasses } from "@/components/ui/Button";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { BookingWidget } from "@/components/BookingWidget";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { homeCopy } from "@/lib/homeCopy";

const PROP_ICONS = [Calendar, Globe, Bell, LayoutTemplate];
const SITE_ICONS = [LayoutTemplate, Webhook, Link2];
const STEP_ICONS = [Clock, Mail, Bell, Calendar];

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const activeEventTypes = useQuery(api.eventTypes.listActive);
  const primaryEventType = activeEventTypes?.[0];
  const { t, locale } = useTranslation();
  const c = homeCopy(locale);
  const mail = `mailto:hello@core829.net?subject=${encodeURIComponent(c.emailSubject)}`;
  const snippet = `<iframe\n  src="https://bookings.core829.net/embed/intro-call?accent=%23FF2743&font=Inter&lang=${locale}"\n  width="100%" height="720" style="border:0"\n  title="${c.book}"></iframe>`;

  return (
    <>
      <PublicHeader />
      <main className="flex flex-1 flex-col">
        {/* Hero: area d'impatto in Rosso Racing, testi grandi in bianco (>= 24 px) */}
        <GlassScene className="glass-red relative mt-3 overflow-hidden text-background sm:mx-3 sm:rounded-[2rem]" backdrop="/brand/glass-red.webp">
          <Image
            src="/brand/symbol-white.svg"
            alt=""
            width={1022}
            height={692}
            unoptimized
            aria-hidden
            className="pointer-events-none absolute -right-24 top-1/2 hidden w-[52rem] max-w-none -translate-y-1/2 opacity-[0.16] lg:block"
          />
          <div className="container-core829 relative flex min-h-[34rem] flex-col justify-center py-20 lg:min-h-[40rem]">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink">{c.heroKicker}</p>
            <h1 className="mt-5 max-w-3xl text-[clamp(1.75rem,1rem+3.4vw,3.6rem)]">{c.heroTitle}</h1>
            <p className="mt-6 max-w-xl text-lg text-ink">{c.heroSubtitle}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link {...GLASS} href="/#prenota" className={buttonClasses("primary", undefined, "dark")}>
                {c.heroBook}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a {...GLASS} href={mail} className={buttonClasses("secondary")}>
                {c.heroEmail}
              </a>
            </div>
          </div>
        </GlassScene>

        {/* Calendario reale */}
        <GlassScene id="prenota" className="glass-light container-core829 scroll-mt-24 py-20 lg:py-24" backdrop="/brand/glass-light.webp">
          <p className="kicker">{c.tryKicker}</p>
          <h2 className="title-brand mt-3 max-w-3xl">{c.tryTitle}</h2>
          <p className="mt-4 max-w-2xl text-foreground-muted">{c.tryBody}</p>
          {primaryEventType && (
            <div {...GLASS} className="glass-card mt-8 rounded-3xl border border-border bg-surface p-4 sm:p-8">
              <BookingWidget slug={primaryEventType.slug} compact />
            </div>
          )}
        </GlassScene>

        {/* Perché funziona */}
        <GlassScene className="glass-light border-t border-border" backdrop="/brand/glass-light.webp">
          <div className="container-core829 py-20 lg:py-24">
            <p className="kicker">{c.whyKicker}</p>
            <h2 className="title-brand mt-3 max-w-3xl">{c.whyTitle}</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {c.props.map((p, i) => {
                const Icon = PROP_ICONS[i] ?? Calendar;
                return (
                  <article {...GLASS} key={p.t} className="card-lift border border-border bg-background p-7">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-on-ink">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="mt-6 text-lg">{p.t}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{p.d}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </GlassScene>

        {/* Come funziona */}
        <section id="come-funziona" className="container-core829 scroll-mt-24 py-20 lg:py-24">
          <p className="kicker">{c.howKicker}</p>
          <h2 className="title-brand mt-3 max-w-3xl">{c.howTitle}</h2>
          <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <span aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-border lg:block" />
            {c.steps.map((s, i) => {
              const Icon = STEP_ICONS[i] ?? Calendar;
              return (
                <li key={s.t} className="relative">
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-ink">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="tech-label mt-5">0{i + 1}</p>
                  <h3 className="mt-1 text-lg">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{s.d}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Per il tuo sito */}
        <section id="sito" className="scroll-mt-24 border-t border-border bg-surface">
          <div className="container-core829 grid grid-cols-[minmax(0,1fr)] gap-12 py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
            <div>
              <p className="kicker">{c.siteKicker}</p>
              <h2 className="title-brand mt-3">{c.siteTitle}</h2>
              <p className="mt-4 max-w-xl text-foreground-muted">{c.siteBody}</p>
              <ul className="mt-8 space-y-4">
                {c.siteCards.map((s, i) => {
                  const Icon = SITE_ICONS[i] ?? Link2;
                  return (
                    <li key={s.t} className="flex items-start gap-4">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-on-ink">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span>
                        <span className="block font-semibold">{s.t}</span>
                        <span className="block text-sm text-foreground-muted">{s.d}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="self-center">
              <p className="tech-label mb-3">{c.snippetLabel}</p>
              <pre tabIndex={0} aria-label={c.snippetLabel} className="overflow-x-auto rounded-3xl bg-ink p-6 text-[0.8rem] leading-relaxed text-on-ink">
                <code>{snippet}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Contatti: scrivere o chiamare (nessun prezzo pubblico) */}
        <section id="contatti" className="scroll-mt-24 bg-ink text-on-ink">
          <div className="container-core829 py-20 text-center lg:py-28">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em]" style={{ color: "var(--color-accent)" }}>
              {c.ctaKicker}
            </p>
            <h2 className="title-brand mx-auto mt-4 max-w-3xl !text-on-ink">{c.ctaTitle}</h2>
            <p className="mx-auto mt-5 max-w-xl text-on-ink-muted">{c.ctaBody}</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a {...GLASS} href={mail} className={buttonClasses("primary")}>
                <Mail className="h-4 w-4" aria-hidden />
                {c.ctaEmail}
              </a>
              <a {...GLASS} href="tel:+40766668482" className={buttonClasses("secondary", undefined, "dark")}>
                <Phone className="h-4 w-4" aria-hidden />
                {c.ctaCall} +40 766 668 482
              </a>
              <a {...GLASS} href="tel:+393759468881" className={buttonClasses("secondary", undefined, "dark")}>
                <Phone className="h-4 w-4" aria-hidden />
                {c.ctaCall} +39 375 946 8881
              </a>
            </div>
            <p className="mt-10 text-sm">
              <a
                href="https://www.trustpilot.com/review/core829.net"
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-ink-muted underline underline-offset-4 transition-colors hover:text-on-ink"
              >
                {c.reviews}
              </a>
            </p>
            {!isLoading && (
              <p className="mt-3 text-sm">
                <Link href={isAuthenticated ? "/calendar" : "/signin"} className="text-on-ink-muted transition-colors hover:text-on-ink">
                  {isAuthenticated ? t("home_dashboard") : t("home_teamLogin")}
                </Link>
              </p>
            )}
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
