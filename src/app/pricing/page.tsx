import type { Metadata } from "next";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Prezzi",
  description: "Il sistema di prenotazione CORE829 per la tua azienda — piani e prezzi.",
};

const TIERS = [
  {
    name: "Free",
    price: "€0",
    period: "",
    description: "Per provare il sistema con una singola pagina di prenotazione.",
    features: [
      "1 pagina di prenotazione ospitata",
      "Calendario con fusi orari automatici",
      "Email di conferma e promemoria",
      "Branding CORE829",
    ],
    cta: "Prenota una call",
    href: "/book/intro-call",
    highlight: false,
  },
  {
    name: "Booking Pro",
    price: "€49",
    period: "/mese",
    description: "Il tuo sistema di prenotazione, con il tuo brand, ovunque tu voglia.",
    features: [
      "Widget incorporabile con il TUO logo, font e colori",
      "Notifiche webhook verso il tuo CRM/Slack",
      "Chiave API per integrazioni personalizzate",
      "Assistenza diretta 1 a 1 per la configurazione",
      "Nessun limite di prenotazioni",
    ],
    cta: "Prenota l'onboarding 1 a 1",
    href: "/book/booking-pro-onboarding",
    highlight: true,
  },
];

export default function PricingPage() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-container flex-1 px-6 py-20 sm:px-12 lg:px-20">
        <p className="kicker">Prezzi</p>
        <h1 className="mt-2 max-w-xl text-3xl font-semibold text-foreground sm:text-4xl">
          Più comodo di Calendly, più accessibile di costruirlo da zero
        </h1>
        <p className="mt-4 max-w-2xl text-foreground-muted">
          Stesso motore che usiamo per CORE829 stesso — timezone corretti,
          zero doppie prenotazioni, email automatiche — ma con il tuo brand
          al posto del nostro, e una persona vera che ti aiuta a impostarlo.
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col border p-8 ${
                tier.highlight ? "border-accent bg-surface" : "border-border"
              }`}
            >
              <h2 className="text-lg font-semibold text-foreground">{tier.name}</h2>
              <p className="mt-4">
                <span className="text-4xl font-semibold text-foreground">{tier.price}</span>
                <span className="text-foreground-muted">{tier.period}</span>
              </p>
              <p className="mt-4 text-sm text-foreground-muted">{tier.description}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-foreground">
                    <span className="text-accent">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={tier.href} className="mt-8 inline-block w-fit">
                <Button variant={tier.highlight ? "primary" : "secondary"}>{tier.cta}</Button>
              </a>
            </div>
          ))}
        </div>

        <p className="mt-12 max-w-2xl text-sm text-foreground-muted">
          Booking Pro non è self-service istantaneo: prenoti una call di 30
          minuti, configuriamo insieme il tuo widget e la tua pagina, e sei
          operativo lo stesso giorno.
        </p>
      </main>
      <PublicFooter />
    </>
  );
}
