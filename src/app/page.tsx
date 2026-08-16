"use client";

import Image from "next/image";
import Script from "next/script";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { BookingWidget } from "@/components/BookingWidget";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const VALUE_PROPS = [
  {
    title: "Zero doppie prenotazioni",
    body: "Ogni prenotazione viene verificata in tempo reale contro il calendario del team: due persone non potranno mai occupare lo stesso slot, nemmeno cliccando nello stesso istante.",
  },
  {
    title: "Fusi orari gestiti per te",
    body: "Chi prenota vede sempre l'orario nel proprio fuso; il tuo team lavora nel suo. Il calcolo tiene conto anche dei cambi d'ora legale, senza slot fantasma o doppi orari.",
  },
  {
    title: "Conferme ed email automatiche",
    body: "Conferma via email immediata dopo ogni prenotazione, promemoria automatici a 24 ore e a 1 ora dall'appuntamento, link diretto per cancellare o riprogrammare senza bisogno di un account.",
  },
  {
    title: "Widget per il tuo sito",
    body: "Lo stesso calendario che vedi qui sotto si integra in qualsiasi sito con una riga di codice, oppure via API con notifiche webhook quando un visitatore prenota, cancella o riprogramma.",
  },
];

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const activeEventTypes = useQuery(api.eventTypes.listActive);
  const primaryEventType = activeEventTypes?.[0];
  const { t } = useTranslation();

  return (
    <>
      <PublicHeader />
      <main className="flex flex-1 flex-col">
        <section className="relative flex min-h-[32rem] flex-col overflow-hidden">
          <Image
            src="/core829branding/core829-banner.webp"
            alt=""
            fill
            priority
            className="object-cover"
          />
          <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-20 sm:px-12 lg:px-20">
            <p className="text-xs uppercase tracking-[0.25em] text-white/70">
              {t("home_kicker")}
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold text-white sm:text-5xl">
              {t("home_title")}
            </h1>
            <p className="mt-4 max-w-md text-white/80">{t("home_subtitle")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {primaryEventType && (
                <a href="#prenota" className="inline-block w-fit">
                  <Button
                    variant="secondary"
                    className="border-white bg-white text-foreground hover:bg-transparent hover:text-white"
                  >
                    {t("home_bookNow")}
                  </Button>
                </a>
              )}
              {!isLoading && (
                <a href={isAuthenticated ? "/calendar" : "/signin"} className="inline-block w-fit">
                  <Button
                    variant="secondary"
                    className="border-white text-white hover:bg-white hover:text-foreground"
                  >
                    {isAuthenticated ? t("home_dashboard") : t("home_teamLogin")}
                  </Button>
                </a>
              )}
            </div>
          </div>
        </section>

        {primaryEventType && (
          <section id="prenota" className="mx-auto w-full max-w-container px-6 py-20 sm:px-12 lg:px-20">
            <p className="kicker">Provalo subito</p>
            <h2 className="mt-2 max-w-xl text-2xl font-semibold text-foreground sm:text-3xl">
              Questo è il calendario vero, in tempo reale
            </h2>
            <p className="mt-3 max-w-2xl text-foreground-muted">
              Nessuna demo finta: scegli un orario qui sotto ed è la stessa
              identica esperienza che avrebbe un cliente sul tuo sito.
            </p>
            <div className="mt-8 border border-border bg-surface p-4 sm:p-8">
              <BookingWidget slug={primaryEventType.slug} compact />
            </div>
          </section>
        )}

        <section className="border-t border-border px-6 py-20 sm:px-12 lg:px-20">
          <div className="mx-auto w-full max-w-container">
            <p className="kicker">Perché usarlo</p>
            <h2 className="mt-2 max-w-xl text-2xl font-semibold text-foreground sm:text-3xl">
              Costruito per non far perdere né tempo né clienti
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              {VALUE_PROPS.map((item) => (
                <div key={item.title} className="border-l-2 border-accent pl-5">
                  <h3 className="text-lg font-medium text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm text-foreground-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto w-full max-w-container px-6 py-20 sm:px-12 lg:px-20">
            <p className="kicker">Il sistema CORE829</p>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold text-foreground sm:text-3xl">
              Un unico sistema di prenotazione, per il nostro team e per i
              clienti CORE829
            </h2>
            <p className="mt-4 max-w-2xl text-foreground-muted">
              Questa piattaforma nasce prima di tutto per gestire gli
              appuntamenti interni di CORE829, ma è pensata per diventare il
              motore di prenotazione anche dei siti che costruiamo per i
              nostri clienti: ogni azienda può avere la propria pagina di
              prenotazione ospitata qui, integrare il widget nel proprio sito
              con una riga di codice, oppure collegarsi via API — con
              un&apos;offerta ad abbonamento mensile dedicata.
            </p>
            <a href="mailto:hello@core829.net" className="mt-8 inline-block w-fit">
              <Button>Richiedi il tuo sistema di prenotazione</Button>
            </a>
          </div>
        </section>

        <section className="mx-auto w-full max-w-container px-6 py-20 sm:px-12 lg:px-20">
          <p className="kicker">Recensioni</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
            Cosa dicono di CORE829
          </h2>
          <div className="mt-8 max-w-xl">
            <div
              className="trustpilot-widget"
              data-locale="en-US"
              data-template-id="56278e9abfbbba0bdcd568bc"
              data-businessunit-id="69980f039111479251cb48b2"
              data-style-height="52px"
              data-style-width="100%"
              data-token="70067085-465e-4ecc-954d-c083004935df"
            >
              <a
                href="https://www.trustpilot.com/review/core829.net"
                target="_blank"
                rel="noopener noreferrer"
              >
                Trustpilot
              </a>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />

      <Script
        src="//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"
        strategy="afterInteractive"
      />
    </>
  );
}
